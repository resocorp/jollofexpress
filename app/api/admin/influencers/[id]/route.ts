// Admin endpoints for individual influencer operations
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';
import { z } from 'zod';
import crypto from 'crypto';

const influencerUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().regex(/^(\+234|0)[789]\d{9}$/).optional(),
  commission_type: z.enum(['percentage', 'fixed_amount']).optional(),
  commission_value: z.number().positive().optional(),
  social_handle: z.string().optional(),
  platform: z.string().optional(),
  notes: z.string().optional(),
  is_active: z.boolean().optional(),
});

// GET - Get single influencer with full details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const { id } = await params;
    const supabase = createServiceClient();

    // Fetch influencer with promo code
    const { data: influencer, error } = await supabase
      .from('influencers')
      .select(`
        *,
        promo_codes(*)
      `)
      .eq('id', id)
      .single();

    if (error || !influencer) {
      return NextResponse.json(
        { error: 'Influencer not found' },
        { status: 404 }
      );
    }

    // Get performance stats
    const { data: attributionStats } = await supabase
      .from('customer_attributions')
      .select('*')
      .eq('influencer_id', id);

    const { data: usageStats } = await supabase
      .from('promo_code_usage')
      .select('*')
      .eq('influencer_id', id)
      .order('created_at', { ascending: false });

    // Get payout history
    const { data: payouts } = await supabase
      .from('influencer_payouts')
      .select('*')
      .eq('influencer_id', id)
      .order('payout_month', { ascending: false });

    const totalCustomers = attributionStats?.length || 0;
    const totalCustomerLTV = attributionStats?.reduce((sum, a) => sum + (a.total_spent || 0), 0) || 0;
    const totalOrders = usageStats?.length || 0;
    const totalRevenue = usageStats?.reduce((sum, u) => sum + (u.order_total || 0), 0) || 0;
    const totalCommission = usageStats?.reduce((sum, u) => sum + (u.commission_amount || 0), 0) || 0;
    const newCustomers = usageStats?.filter(u => u.is_new_customer).length || 0;
    const paidCommission = payouts?.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.paid_amount || 0), 0) || 0;
    const pendingCommission = totalCommission - paidCommission;

    return NextResponse.json({
      ...influencer,
      performance: {
        total_customers: totalCustomers,
        total_customer_ltv: totalCustomerLTV,
        total_orders: totalOrders,
        total_revenue: totalRevenue,
        total_commission: totalCommission,
        paid_commission: paidCommission,
        pending_commission: pendingCommission,
        new_customers: newCustomers,
        avg_order_value: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      },
      recent_usage: usageStats?.slice(0, 10) || [],
      customers: attributionStats || [],
      payouts: payouts || [],
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// PATCH - Update influencer
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const validation = influencerUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Check if email/phone conflicts with another influencer
    if (validation.data.email || validation.data.phone) {
      const conditions = [];
      if (validation.data.email) conditions.push(`email.eq.${validation.data.email}`);
      if (validation.data.phone) conditions.push(`phone.eq.${validation.data.phone}`);

      const { data: existing } = await supabase
        .from('influencers')
        .select('id, email, phone')
        .or(conditions.join(','))
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        const field = existing.email === validation.data.email ? 'email' : 'phone';
        return NextResponse.json(
          { error: `Another influencer with this ${field} already exists` },
          { status: 400 }
        );
      }
    }

    const { data: influencer, error } = await supabase
      .from('influencers')
      .update(validation.data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating influencer:', error);
      return NextResponse.json(
        { error: 'Failed to update influencer' },
        { status: 500 }
      );
    }

    if (!influencer) {
      return NextResponse.json(
        { error: 'Influencer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(influencer);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// DELETE - Delete or deactivate influencer
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const { id } = await params;
    const supabase = createServiceClient();

    // Check if influencer has any usage (attributions or promo usage)
    const { count: usageCount } = await supabase
      .from('promo_code_usage')
      .select('*', { count: 'exact', head: true })
      .eq('influencer_id', id);

    if (usageCount && usageCount > 0) {
      // Deactivate instead of delete to preserve history
      await supabase
        .from('influencers')
        .update({ is_active: false })
        .eq('id', id);

      // Also deactivate associated promo codes
      await supabase
        .from('promo_codes')
        .update({ is_active: false })
        .eq('influencer_id', id);

      return NextResponse.json({
        success: true,
        message: 'Influencer deactivated (has usage history)',
        deactivated: true,
      });
    }

    // Delete promo codes first (cascade should handle this but being explicit)
    await supabase
      .from('promo_codes')
      .delete()
      .eq('influencer_id', id);

    // Delete influencer
    const { error } = await supabase
      .from('influencers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting influencer:', error);
      return NextResponse.json(
        { error: 'Failed to delete influencer' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Influencer deleted successfully',
      deleted: true,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// POST - Regenerate access token
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const action = body.action;

    const supabase = createServiceClient();

    if (action === 'regenerate_token') {
      const newToken = crypto.randomBytes(32).toString('hex');
      const tokenExpiresAt = new Date();
      tokenExpiresAt.setFullYear(tokenExpiresAt.getFullYear() + 1);

      const { data: influencer, error } = await supabase
        .from('influencers')
        .update({
          access_token: newToken,
          token_expires_at: tokenExpiresAt.toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error || !influencer) {
        return NextResponse.json(
          { error: 'Failed to regenerate token' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        access_token: newToken,
        dashboard_url: `${process.env.NEXT_PUBLIC_APP_URL}/influencer/dashboard?token=${newToken}`,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
