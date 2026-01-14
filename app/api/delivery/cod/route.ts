// Cash on Delivery (COD) collection API
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdminAuth, verifyAdminOnly } from '@/lib/auth/admin-auth';
import { z } from 'zod';

const collectSchema = z.object({
  order_id: z.string().uuid(),
  driver_id: z.string().uuid(),
  amount: z.number().positive(),
});

const settleSchema = z.object({
  collection_ids: z.array(z.string().uuid()),
  settled_by: z.string().uuid(),
  notes: z.string().optional(),
});

// GET /api/delivery/cod - Get COD collections (filter by driver/status)
export async function GET(request: NextRequest) {
  // Verify authentication
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get('driver_id');
    const status = searchParams.get('status');

    let query = supabase
      .from('cod_collections')
      .select(`
        *,
        orders(order_number, customer_name, total),
        drivers(name, phone)
      `)
      .order('created_at', { ascending: false });

    if (driverId) {
      query = query.eq('driver_id', driverId);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data: collections, error } = await query;
    if (error) throw error;

    return NextResponse.json(collections);
  } catch (error: any) {
    console.error('COD fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch COD collections' },
      { status: 500 }
    );
  }
}

// POST /api/delivery/cod - Record COD collection (driver collects cash)
export async function POST(request: NextRequest) {
  // Verify authentication
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const { order_id, driver_id, amount } = collectSchema.parse(body);
    
    const supabase = createServiceClient();

    // Check if collection already exists
    const { data: existing } = await supabase
      .from('cod_collections')
      .select('id')
      .eq('order_id', order_id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'COD collection already recorded for this order' },
        { status: 400 }
      );
    }

    // Create COD collection record
    const { data: collection, error } = await supabase
      .from('cod_collections')
      .insert({
        order_id,
        driver_id,
        amount,
        status: 'collected',
        collected_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Update driver's COD balance
    await supabase.rpc('increment_driver_cod_balance', {
      p_driver_id: driver_id,
      p_amount: amount,
    });

    // Mark order as cash collected
    await supabase
      .from('orders')
      .update({
        cash_collected: true,
        payment_status: 'success',
      })
      .eq('id', order_id);

    return NextResponse.json({
      success: true,
      collection,
      message: 'COD collection recorded',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('COD collection error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to record COD collection' },
      { status: 500 }
    );
  }
}

// PATCH /api/delivery/cod - Settle COD collections (admin settles with driver)
export async function PATCH(request: NextRequest) {
  // Verify admin-only authentication (settlement is admin action)
  const authResult = await verifyAdminOnly(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const { collection_ids, settled_by, notes } = settleSchema.parse(body);
    
    const supabase = createServiceClient();

    // Get total amount to settle
    const { data: collections, error: fetchError } = await supabase
      .from('cod_collections')
      .select('id, amount, driver_id')
      .in('id', collection_ids)
      .eq('status', 'collected');

    if (fetchError) throw fetchError;
    if (!collections || collections.length === 0) {
      return NextResponse.json(
        { error: 'No pending collections found' },
        { status: 400 }
      );
    }

    // Calculate total by driver
    const driverTotals: Record<string, number> = {};
    for (const c of collections) {
      driverTotals[c.driver_id] = (driverTotals[c.driver_id] || 0) + Number(c.amount);
    }

    // Update collections to settled
    const { error: updateError } = await supabase
      .from('cod_collections')
      .update({
        status: 'settled',
        settled_at: new Date().toISOString(),
        settled_by,
        notes,
      })
      .in('id', collection_ids);

    if (updateError) throw updateError;

    // Reduce driver COD balances
    for (const [driverId, total] of Object.entries(driverTotals)) {
      await supabase.rpc('decrement_driver_cod_balance', {
        p_driver_id: driverId,
        p_amount: total,
      });
    }

    return NextResponse.json({
      success: true,
      settled_count: collections.length,
      total_amount: collections.reduce((sum, c) => sum + Number(c.amount), 0),
      message: 'COD collections settled',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('COD settlement error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to settle COD collections' },
      { status: 500 }
    );
  }
}
