// Admin endpoint: CRUD for delivery window templates
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';

// GET - List all delivery window templates
export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('delivery_windows')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch delivery windows' }, { status: 500 });
    }

    return NextResponse.json({ windows: data || [] });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

// POST - Create a new delivery window template
export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const { name, order_open_time, cutoff_time, delivery_start, delivery_end, max_capacity, is_active, display_order, days_of_week } = body;

    if (!name || !order_open_time || !cutoff_time || !delivery_start || !delivery_end) {
      return NextResponse.json({ error: 'Missing required fields: name, order_open_time, cutoff_time, delivery_start, delivery_end' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('delivery_windows')
      .insert({
        name,
        order_open_time,
        cutoff_time,
        delivery_start,
        delivery_end,
        max_capacity: max_capacity || 50,
        is_active: is_active ?? true,
        display_order: display_order || 0,
        days_of_week: days_of_week || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating delivery window:', error);
      return NextResponse.json({ error: error.message || 'Failed to create delivery window' }, { status: 500 });
    }

    return NextResponse.json({ window: data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
