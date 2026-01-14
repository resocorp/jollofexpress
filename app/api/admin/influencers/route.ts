// Admin endpoints for influencer management
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';
import { z } from 'zod';
import crypto from 'crypto';

// Validation schema for creating influencer
const influencerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^(\+234|0)[789]\d{9}$/, 'Invalid Nigerian phone number'),
  commission_type: z.enum(['percentage', 'fixed_amount']),
  commission_value: z.number().positive('Commission must be positive'),
  social_handle: z.string().optional(),
  platform: z.string().optional(),
  notes: z.string().optional(),
  is_active: z.boolean().optional(),
  // Promo code details (one code per influencer)
  promo_code: z.string().min(3).max(20).toUpperCase().optional(),
  promo_discount_type: z.enum(['percentage', 'fixed_amount']).optional(),
  promo_discount_value: z.number().positive().optional(),
  promo_max_discount: z.number().positive().optional(),
  promo_min_order_value: z.number().min(0).optional(),
  promo_usage_limit: z.number().int().positive().optional(),
  promo_expiry_date: z.string().datetime().optional(),
});

// Generate a secure access token
function generateAccessToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// GET - List all influencers with their promo codes and performance
export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const includePerformance = searchParams.get('include_performance') === 'true';

    // Fetch influencers with their promo codes
    const { data: influencers, error } = await supabase
      .from('influencers')
      .select(`
        *,
        promo_codes(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching influencers:', error);
      return NextResponse.json(
        { error: 'Failed to fetch influencers' },
        { status: 500 }
      );
    }

    // If performance metrics requested, fetch additional data
    if (includePerformance && influencers) {
      const enrichedInfluencers = await Promise.all(
        influencers.map(async (influencer) => {
          // Get customer attribution stats
          const { data: attributionStats } = await supabase
            .from('customer_attributions')
            .select('total_orders, total_spent')
            .eq('influencer_id', influencer.id);

          // Get promo usage stats
          const { data: usageStats } = await supabase
            .from('promo_code_usage')
            .select('order_total, commission_amount, is_new_customer')
            .eq('influencer_id', influencer.id);

          const totalCustomers = attributionStats?.length || 0;
          const totalCustomerLTV = attributionStats?.reduce((sum, a) => sum + (a.total_spent || 0), 0) || 0;
          const totalOrders = usageStats?.length || 0;
          const totalRevenue = usageStats?.reduce((sum, u) => sum + (u.order_total || 0), 0) || 0;
          const totalCommission = usageStats?.reduce((sum, u) => sum + (u.commission_amount || 0), 0) || 0;
          const newCustomers = usageStats?.filter(u => u.is_new_customer).length || 0;

          return {
            ...influencer,
            performance: {
              total_customers: totalCustomers,
              total_customer_ltv: totalCustomerLTV,
              total_orders: totalOrders,
              total_revenue: totalRevenue,
              total_commission: totalCommission,
              new_customers: newCustomers,
              avg_order_value: totalOrders > 0 ? totalRevenue / totalOrders : 0,
            },
          };
        })
      );

      return NextResponse.json(enrichedInfluencers);
    }

    return NextResponse.json(influencers || []);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// POST - Create new influencer with optional promo code
export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const validation = influencerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const data = validation.data;

    // Check if email or phone already exists
    const { data: existing } = await supabase
      .from('influencers')
      .select('id, email, phone')
      .or(`email.eq.${data.email},phone.eq.${data.phone}`)
      .maybeSingle();

    if (existing) {
      const field = existing.email === data.email ? 'email' : 'phone';
      return NextResponse.json(
        { error: `An influencer with this ${field} already exists` },
        { status: 400 }
      );
    }

    // If promo code provided, check if it exists
    if (data.promo_code) {
      const { data: existingPromo } = await supabase
        .from('promo_codes')
        .select('id')
        .eq('code', data.promo_code)
        .maybeSingle();

      if (existingPromo) {
        return NextResponse.json(
          { error: 'This promo code already exists' },
          { status: 400 }
        );
      }
    }

    // Generate access token for influencer dashboard
    const accessToken = generateAccessToken();
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setFullYear(tokenExpiresAt.getFullYear() + 1); // 1 year expiry

    // Create influencer
    const { data: influencer, error: influencerError } = await supabase
      .from('influencers')
      .insert({
        name: data.name,
        email: data.email,
        phone: data.phone,
        commission_type: data.commission_type,
        commission_value: data.commission_value,
        social_handle: data.social_handle,
        platform: data.platform,
        notes: data.notes,
        is_active: data.is_active ?? true,
        access_token: accessToken,
        token_expires_at: tokenExpiresAt.toISOString(),
      })
      .select()
      .single();

    if (influencerError) {
      console.error('Error creating influencer:', influencerError);
      return NextResponse.json(
        { error: 'Failed to create influencer' },
        { status: 500 }
      );
    }

    // Create promo code if provided
    let promoCode = null;
    if (data.promo_code && data.promo_discount_type && data.promo_discount_value) {
      const { data: newPromo, error: promoError } = await supabase
        .from('promo_codes')
        .insert({
          code: data.promo_code,
          description: `Influencer code for ${data.name}`,
          discount_type: data.promo_discount_type,
          discount_value: data.promo_discount_value,
          max_discount: data.promo_max_discount,
          min_order_value: data.promo_min_order_value,
          usage_limit: data.promo_usage_limit,
          expiry_date: data.promo_expiry_date,
          influencer_id: influencer.id,
          is_active: true,
          used_count: 0,
        })
        .select()
        .single();

      if (promoError) {
        console.error('Error creating promo code:', promoError);
        // Rollback influencer creation
        await supabase.from('influencers').delete().eq('id', influencer.id);
        return NextResponse.json(
          { error: 'Failed to create promo code' },
          { status: 500 }
        );
      }

      promoCode = newPromo;
    }

    return NextResponse.json(
      {
        ...influencer,
        promo_code: promoCode,
        dashboard_url: `${process.env.NEXT_PUBLIC_APP_URL}/influencer/dashboard?token=${accessToken}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
