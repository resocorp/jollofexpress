// Influencer dashboard API - for influencer's own view
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

// Verify influencer token
async function verifyInfluencerToken(request: NextRequest) {
  const token = request.headers.get('x-influencer-token') || 
                request.nextUrl.searchParams.get('token');

  if (!token) {
    return { authenticated: false, response: NextResponse.json(
      { error: 'No access token provided' },
      { status: 401 }
    )};
  }

  const supabase = createServiceClient();

  const { data: influencer, error } = await supabase
    .from('influencers')
    .select('*')
    .eq('access_token', token)
    .eq('is_active', true)
    .single();

  if (error || !influencer) {
    return { authenticated: false, response: NextResponse.json(
      { error: 'Invalid or expired access token' },
      { status: 401 }
    )};
  }

  // Check token expiry
  if (influencer.token_expires_at && new Date(influencer.token_expires_at) < new Date()) {
    return { authenticated: false, response: NextResponse.json(
      { error: 'Access token has expired' },
      { status: 401 }
    )};
  }

  return { authenticated: true, influencer };
}

// GET - Get influencer dashboard data
export async function GET(request: NextRequest) {
  const authResult = await verifyInfluencerToken(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  const influencer = authResult.influencer!;

  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30';
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Get influencer's promo code
    const { data: promoCode } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('influencer_id', influencer.id)
      .maybeSingle();

    // Get all-time stats (including order details for recent purchases)
    const { data: allTimeUsage } = await supabase
      .from('promo_code_usage')
      .select('order_id, order_total, commission_amount, is_new_customer, customer_name, customer_phone, created_at')
      .eq('influencer_id', influencer.id)
      .order('created_at', { ascending: false });

    // Get period stats
    const periodUsage = allTimeUsage?.filter(
      u => new Date(u.created_at) >= startDate
    ) || [];

    // Get customer attributions
    const { data: customers } = await supabase
      .from('customer_attributions')
      .select('*')
      .eq('influencer_id', influencer.id)
      .order('total_spent', { ascending: false })
      .limit(20);

    // Get payouts
    const { data: payouts } = await supabase
      .from('influencer_payouts')
      .select('*')
      .eq('influencer_id', influencer.id)
      .order('payout_month', { ascending: false })
      .limit(12);

    // Calculate stats
    const allTimeStats = {
      total_orders: allTimeUsage?.length || 0,
      total_revenue: allTimeUsage?.reduce((sum, u) => sum + (u.order_total || 0), 0) || 0,
      total_commission: allTimeUsage?.reduce((sum, u) => sum + (u.commission_amount || 0), 0) || 0,
      new_customers: allTimeUsage?.filter(u => u.is_new_customer).length || 0,
    };

    const periodStats = {
      total_orders: periodUsage.length,
      total_revenue: periodUsage.reduce((sum, u) => sum + (u.order_total || 0), 0),
      total_commission: periodUsage.reduce((sum, u) => sum + (u.commission_amount || 0), 0),
      new_customers: periodUsage.filter(u => u.is_new_customer).length,
    };

    // Calculate payout info
    const paidAmount = payouts?.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.paid_amount || 0), 0) || 0;
    const pendingAmount = allTimeStats.total_commission - paidAmount;

    // Build daily trend for period
    const dailyMap = new Map<string, { orders: number; revenue: number; commission: number }>();
    const currentDate = new Date(startDate);
    const today = new Date();
    while (currentDate <= today) {
      const dateKey = currentDate.toISOString().split('T')[0];
      dailyMap.set(dateKey, { orders: 0, revenue: 0, commission: 0 });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    periodUsage.forEach(u => {
      const dateKey = new Date(u.created_at).toISOString().split('T')[0];
      const existing = dailyMap.get(dateKey);
      if (existing) {
        existing.orders += 1;
        existing.revenue += u.order_total || 0;
        existing.commission += u.commission_amount || 0;
      }
    });

    const trend = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Build recent purchases list (last 10 orders)
    const recentPurchases = (allTimeUsage || []).slice(0, 10).map(u => ({
      order_id: u.order_id,
      customer_name: u.customer_name || 'Anonymous',
      customer_phone: u.customer_phone,
      order_total: u.order_total,
      commission_earned: u.commission_amount,
      is_new_customer: u.is_new_customer,
      date: u.created_at,
    }));

    return NextResponse.json({
      influencer: {
        id: influencer.id,
        name: influencer.name,
        email: influencer.email,
        commission_type: influencer.commission_type,
        commission_value: influencer.commission_value,
        social_handle: influencer.social_handle,
        platform: influencer.platform,
      },
      promo_code: promoCode ? {
        code: promoCode.code,
        discount_type: promoCode.discount_type,
        discount_value: promoCode.discount_value,
        used_count: allTimeUsage?.length || 0, // Use actual count from usage table
        is_active: promoCode.is_active,
      } : null,
      all_time_stats: allTimeStats,
      period_stats: periodStats,
      period_days: parseInt(period),
      earnings: {
        total_earned: allTimeStats.total_commission,
        paid: paidAmount,
        pending: pendingAmount,
      },
      total_customers: customers?.length || 0,
      top_customers: customers?.slice(0, 10) || [],
      recent_purchases: recentPurchases,
      recent_payouts: payouts || [],
      trend,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
