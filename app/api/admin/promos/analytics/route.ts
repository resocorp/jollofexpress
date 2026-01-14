// Promo code analytics endpoints
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';

// GET - Get promo code analytics
export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    
    const promoId = searchParams.get('promo_id');
    const period = searchParams.get('period') || '30'; // days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // If specific promo requested
    if (promoId) {
      return await getPromoAnalytics(supabase, promoId, startDate);
    }

    // Get all promo analytics summary
    const { data: promos, error: promosError } = await supabase
      .from('promo_codes')
      .select(`
        id,
        code,
        discount_type,
        discount_value,
        used_count,
        usage_limit,
        is_active,
        influencer_id,
        influencers(name)
      `)
      .order('used_count', { ascending: false });

    if (promosError) {
      console.error('Error fetching promos:', promosError);
      return NextResponse.json(
        { error: 'Failed to fetch promo analytics' },
        { status: 500 }
      );
    }

    // Get usage stats for each promo
    const analyticsPromises = (promos || []).map(async (promo) => {
      const { data: usageData } = await supabase
        .from('promo_code_usage')
        .select('order_total, discount_applied, is_new_customer, customer_phone')
        .eq('promo_code_id', promo.id)
        .gte('created_at', startDate.toISOString());

      const totalUses = usageData?.length || 0;
      const totalRevenue = usageData?.reduce((sum, u) => sum + (u.order_total || 0), 0) || 0;
      const totalDiscount = usageData?.reduce((sum, u) => sum + (u.discount_applied || 0), 0) || 0;
      const uniqueCustomers = new Set(usageData?.map(u => u.customer_phone)).size;
      const newCustomers = usageData?.filter(u => u.is_new_customer).length || 0;

      return {
        promo_code_id: promo.id,
        code: promo.code,
        discount_type: promo.discount_type,
        discount_value: promo.discount_value,
        is_active: promo.is_active,
        usage_limit: promo.usage_limit,
        total_used_count: promo.used_count,
        influencer_id: promo.influencer_id,
        influencer_name: (promo.influencers as any)?.name,
        // Period-specific stats
        period_uses: totalUses,
        period_revenue: totalRevenue,
        period_discount: totalDiscount,
        period_unique_customers: uniqueCustomers,
        period_new_customers: newCustomers,
        period_avg_order_value: totalUses > 0 ? totalRevenue / totalUses : 0,
      };
    });

    const analytics = await Promise.all(analyticsPromises);

    // Calculate totals
    const totals = {
      total_promos: promos?.length || 0,
      active_promos: promos?.filter(p => p.is_active).length || 0,
      total_uses: analytics.reduce((sum, a) => sum + a.period_uses, 0),
      total_revenue: analytics.reduce((sum, a) => sum + a.period_revenue, 0),
      total_discount: analytics.reduce((sum, a) => sum + a.period_discount, 0),
      total_new_customers: analytics.reduce((sum, a) => sum + a.period_new_customers, 0),
    };

    return NextResponse.json({
      period: parseInt(period),
      start_date: startDate.toISOString(),
      totals,
      promos: analytics,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Get detailed analytics for a specific promo
async function getPromoAnalytics(
  supabase: ReturnType<typeof createServiceClient>,
  promoId: string,
  startDate: Date
) {
  // Get promo details
  const { data: promo, error: promoError } = await supabase
    .from('promo_codes')
    .select(`
      *,
      influencers(*)
    `)
    .eq('id', promoId)
    .single();

  if (promoError || !promo) {
    return NextResponse.json(
      { error: 'Promo code not found' },
      { status: 404 }
    );
  }

  // Get all usage records
  const { data: usageRecords } = await supabase
    .from('promo_code_usage')
    .select('*')
    .eq('promo_code_id', promoId)
    .order('created_at', { ascending: false });

  // Get period usage records
  const periodUsage = usageRecords?.filter(
    u => new Date(u.created_at) >= startDate
  ) || [];

  // Calculate summary stats
  const totalUses = periodUsage.length;
  const totalRevenue = periodUsage.reduce((sum, u) => sum + (u.order_total || 0), 0);
  const totalDiscount = periodUsage.reduce((sum, u) => sum + (u.discount_applied || 0), 0);
  const totalCommission = periodUsage.reduce((sum, u) => sum + (u.commission_amount || 0), 0);
  const uniqueCustomers = new Set(periodUsage.map(u => u.customer_phone)).size;
  const newCustomers = periodUsage.filter(u => u.is_new_customer).length;
  const firstOrders = periodUsage.filter(u => u.is_first_order).length;

  // Build daily trend data
  const dailyMap = new Map<string, { uses: number; revenue: number; discount: number; new_customers: number }>();
  
  // Initialize all days in period
  const currentDate = new Date(startDate);
  const today = new Date();
  while (currentDate <= today) {
    const dateKey = currentDate.toISOString().split('T')[0];
    dailyMap.set(dateKey, { uses: 0, revenue: 0, discount: 0, new_customers: 0 });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Populate with actual data
  periodUsage.forEach(u => {
    const dateKey = new Date(u.created_at).toISOString().split('T')[0];
    const existing = dailyMap.get(dateKey);
    if (existing) {
      existing.uses += 1;
      existing.revenue += u.order_total || 0;
      existing.discount += u.discount_applied || 0;
      existing.new_customers += u.is_new_customer ? 1 : 0;
    }
  });

  const trend = Array.from(dailyMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({
    promo,
    summary: {
      total_uses: totalUses,
      total_revenue: totalRevenue,
      total_discount: totalDiscount,
      total_commission: totalCommission,
      unique_customers: uniqueCustomers,
      new_customers: newCustomers,
      first_orders: firstOrders,
      avg_order_value: totalUses > 0 ? totalRevenue / totalUses : 0,
      conversion_rate: uniqueCustomers > 0 ? (totalUses / uniqueCustomers) * 100 : 0,
    },
    trend,
    recent_usage: usageRecords?.slice(0, 20) || [],
  });
}
