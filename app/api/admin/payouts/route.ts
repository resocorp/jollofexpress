// Influencer payout management endpoints
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';
import { z } from 'zod';

const payoutUpdateSchema = z.object({
  status: z.enum(['pending', 'processing', 'paid', 'failed']),
  paid_amount: z.number().min(0).optional(),
  payment_reference: z.string().optional(),
  payment_notes: z.string().optional(),
});

// GET - List all payouts or generate pending payouts
export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    
    const influencerId = searchParams.get('influencer_id');
    const status = searchParams.get('status');
    const month = searchParams.get('month'); // Format: YYYY-MM

    let query = supabase
      .from('influencer_payouts')
      .select(`
        *,
        influencers(id, name, email, phone, commission_type, commission_value)
      `)
      .order('payout_month', { ascending: false });

    if (influencerId) {
      query = query.eq('influencer_id', influencerId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (month) {
      const monthStart = `${month}-01`;
      query = query.eq('payout_month', monthStart);
    }

    const { data: payouts, error } = await query;

    if (error) {
      console.error('Error fetching payouts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch payouts' },
        { status: 500 }
      );
    }

    // Calculate totals
    const totals = {
      total_payouts: payouts?.length || 0,
      pending_amount: payouts?.filter(p => p.status === 'pending').reduce((sum, p) => sum + (p.commission_earned || 0), 0) || 0,
      paid_amount: payouts?.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.paid_amount || 0), 0) || 0,
    };

    return NextResponse.json({ totals, payouts: payouts || [] });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// POST - Generate monthly payouts for all influencers
export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const { month } = body; // Format: YYYY-MM

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: 'Invalid month format. Use YYYY-MM' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const monthStart = `${month}-01`;
    const monthEnd = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 0);
    const monthEndStr = monthEnd.toISOString().split('T')[0];

    // Get all active influencers
    const { data: influencers } = await supabase
      .from('influencers')
      .select('id, name, commission_type, commission_value')
      .eq('is_active', true);

    if (!influencers || influencers.length === 0) {
      return NextResponse.json({ message: 'No active influencers found', payouts: [] });
    }

    const payoutResults = [];

    for (const influencer of influencers) {
      // Check if payout already exists for this month
      const { data: existingPayout } = await supabase
        .from('influencer_payouts')
        .select('id')
        .eq('influencer_id', influencer.id)
        .eq('payout_month', monthStart)
        .maybeSingle();

      if (existingPayout) {
        continue; // Skip if already generated
      }

      // Calculate earnings for this month from promo_code_usage
      const { data: usageData } = await supabase
        .from('promo_code_usage')
        .select('order_total, commission_amount')
        .eq('influencer_id', influencer.id)
        .gte('created_at', `${monthStart}T00:00:00`)
        .lte('created_at', `${monthEndStr}T23:59:59`);

      const totalOrders = usageData?.length || 0;
      const totalRevenue = usageData?.reduce((sum, u) => sum + (u.order_total || 0), 0) || 0;
      const totalCommission = usageData?.reduce((sum, u) => sum + (u.commission_amount || 0), 0) || 0;

      // Only create payout if there's commission to pay
      if (totalCommission > 0) {
        const { data: payout, error } = await supabase
          .from('influencer_payouts')
          .insert({
            influencer_id: influencer.id,
            payout_month: monthStart,
            total_orders: totalOrders,
            total_revenue_generated: totalRevenue,
            commission_earned: totalCommission,
            status: 'pending',
          })
          .select()
          .single();

        if (!error && payout) {
          payoutResults.push({
            ...payout,
            influencer_name: influencer.name,
          });
        }
      }
    }

    return NextResponse.json({
      message: `Generated ${payoutResults.length} payouts for ${month}`,
      payouts: payoutResults,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// PATCH - Update payout status (mark as paid, etc.)
export async function PATCH(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const { payout_id, ...updateData } = body;

    if (!payout_id) {
      return NextResponse.json(
        { error: 'payout_id is required' },
        { status: 400 }
      );
    }

    const validation = payoutUpdateSchema.safeParse(updateData);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const updatePayload: any = { ...validation.data };

    // If marking as paid, set paid_at timestamp
    if (validation.data.status === 'paid') {
      updatePayload.paid_at = new Date().toISOString();
      // If no paid_amount specified, use the commission_earned
      if (!updatePayload.paid_amount) {
        const { data: payout } = await supabase
          .from('influencer_payouts')
          .select('commission_earned')
          .eq('id', payout_id)
          .single();
        updatePayload.paid_amount = payout?.commission_earned || 0;
      }
    }

    const { data: updatedPayout, error } = await supabase
      .from('influencer_payouts')
      .update(updatePayload)
      .eq('id', payout_id)
      .select(`
        *,
        influencers(name, email)
      `)
      .single();

    if (error) {
      console.error('Error updating payout:', error);
      return NextResponse.json(
        { error: 'Failed to update payout' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedPayout);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
