import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    let query = supabase
      .from('delivery_assignments')
      .select(`
        *,
        driver:drivers(id, name, phone, status, cod_balance),
        order:orders(id, order_number, customer_name, customer_phone, delivery_address, total, payment_method_type)
      `)
      .order('assigned_at', { ascending: false });
    
    if (status) {
      const statuses = status.split(',');
      query = query.in('status', statuses);
    }
    
    const { data, error } = await query.limit(50);
    
    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch assignments' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Fetch assignments error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
