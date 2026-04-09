import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { z } from 'zod';

const phoneSchema = z.string().regex(/^(\+234|0)[789]\d{9}$/);

export async function GET(request: NextRequest) {
  try {
    const phone = request.nextUrl.searchParams.get('phone');

    const parsed = phoneSchema.safeParse(phone);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please enter a valid Nigerian phone number' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Normalize: convert 0-prefix to +234
    const normalizedPhone = parsed.data.startsWith('0')
      ? '+234' + parsed.data.slice(1)
      : parsed.data;

    // Also check the 0-prefix variant
    const localPhone = normalizedPhone.startsWith('+234')
      ? '0' + normalizedPhone.slice(4)
      : normalizedPhone;

    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, status, total, created_at, delivery_window, delivery_date, order_type, customer_name, payment_status')
      .or(`customer_phone.eq.${normalizedPhone},customer_phone.eq.${localPhone}`)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error looking up orders:', error);
      return NextResponse.json(
        { error: 'Failed to look up orders' },
        { status: 500 }
      );
    }

    // Only return orders with successful payments (or COD)
    const visibleOrders = (orders || []).filter(
      (o) => o.payment_status === 'success' || o.status !== 'pending'
    );

    return NextResponse.json({ orders: visibleOrders });
  } catch (error) {
    console.error('Error in order lookup:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
