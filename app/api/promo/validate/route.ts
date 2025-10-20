// Validate promo code
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { code, order_total } = await request.json();

    if (!code || order_total === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Find the promo code
    const { data: promo, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !promo) {
      return NextResponse.json({
        valid: false,
        message: 'Invalid promo code',
      });
    }

    // Check if expired
    const now = new Date();
    const expiresAt = new Date(promo.expires_at);
    
    if (expiresAt < now) {
      return NextResponse.json({
        valid: false,
        message: 'This promo code has expired',
      });
    }

    // Check usage limit
    if (promo.max_uses && promo.used_count >= promo.max_uses) {
      return NextResponse.json({
        valid: false,
        message: 'This promo code has reached its usage limit',
      });
    }

    // Check minimum order value
    if (promo.min_order_value && order_total < promo.min_order_value) {
      return NextResponse.json({
        valid: false,
        message: `Minimum order value of ₦${promo.min_order_value} required`,
        min_order_value: promo.min_order_value,
      });
    }

    // Calculate discount
    let discountAmount = 0;
    
    if (promo.discount_type === 'percentage') {
      discountAmount = Math.round((order_total * promo.discount_value) / 100);
      
      // Apply max discount if set
      if (promo.max_discount_amount && discountAmount > promo.max_discount_amount) {
        discountAmount = promo.max_discount_amount;
      }
    } else {
      // Fixed amount discount
      discountAmount = promo.discount_value;
      
      // Ensure discount doesn't exceed order total
      if (discountAmount > order_total) {
        discountAmount = order_total;
      }
    }

    return NextResponse.json({
      valid: true,
      discount_amount: discountAmount,
      discount_type: promo.discount_type,
      message: promo.discount_type === 'percentage' 
        ? `${promo.discount_value}% discount applied` 
        : `₦${promo.discount_value} discount applied`,
      promo_code: promo.code,
    });

  } catch (error) {
    console.error('Error validating promo code:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
