// Admin endpoints for promo code management
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';
import { z } from 'zod';

// Validation schema
const promoSchema = z.object({
  code: z.string().min(3).max(20).toUpperCase(),
  description: z.string().max(200).optional(),
  discount_type: z.enum(['percentage', 'fixed_amount']),
  discount_value: z.number().positive(),
  max_discount: z.number().positive().optional(),
  min_order_value: z.number().min(0).optional(),
  usage_limit: z.number().int().positive().optional(),
  expiry_date: z.string().datetime().optional(),
  is_active: z.boolean().optional(),
});

// GET - List all promo codes
export async function GET(request: NextRequest) {
  // Verify authentication
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const isActive = searchParams.get('is_active');

    const supabase = createServiceClient();

    let query = supabase
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true');
    }

    const { data: promos, error } = await query;

    if (error) {
      console.error('Error fetching promo codes:', error);
      return NextResponse.json(
        { error: 'Failed to fetch promo codes' },
        { status: 500 }
      );
    }

    return NextResponse.json(promos || []);

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// POST - Create new promo code
export async function POST(request: NextRequest) {
  // Verify authentication
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const body = await request.json();

    // Validate
    const validation = promoSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Check if code already exists
    const { data: existing } = await supabase
      .from('promo_codes')
      .select('code')
      .eq('code', validation.data.code)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Promo code already exists' },
        { status: 400 }
      );
    }

    // Insert promo code
    const { data: promo, error } = await supabase
      .from('promo_codes')
      .insert({
        ...validation.data,
        used_count: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating promo code:', error);
      return NextResponse.json(
        { error: 'Failed to create promo code' },
        { status: 500 }
      );
    }

    return NextResponse.json(promo, { status: 201 });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
