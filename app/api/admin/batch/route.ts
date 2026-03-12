// Admin endpoint: Create ad-hoc batch and list batches
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';

// POST - Create an ad-hoc batch for a specific date
export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const { delivery_window_id, delivery_date, max_capacity } = body;

    if (!delivery_window_id || !delivery_date) {
      return NextResponse.json(
        { error: 'Missing required fields: delivery_window_id, delivery_date' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('batches')
      .insert({
        delivery_window_id,
        delivery_date,
        status: 'accepting',
        total_orders: 0,
        max_capacity: max_capacity || 50,
      })
      .select('*, delivery_window:delivery_windows(*)')
      .single();

    if (error) {
      console.error('Error creating batch:', error);
      return NextResponse.json({ error: error.message || 'Failed to create batch' }, { status: 500 });
    }

    return NextResponse.json({ batch: data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
