// Delivery assignment API
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import * as traccar from '@/lib/traccar/client';
import { z } from 'zod';

const assignSchema = z.object({
  order_id: z.string().uuid(),
  driver_id: z.string().uuid(),
});

// POST /api/delivery/assign - Assign driver to order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { order_id, driver_id } = assignSchema.parse(body);
    
    const supabase = createServiceClient();

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, customer_latitude, customer_longitude')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Get driver details
    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('*')
      .eq('id', driver_id)
      .eq('is_active', true)
      .single();

    if (driverError || !driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    // Check driver availability
    if (driver.status !== 'available') {
      return NextResponse.json(
        { error: 'Driver is not available' },
        { status: 400 }
      );
    }

    // Create assignment record
    const { data: assignment, error: assignError } = await supabase
      .from('delivery_assignments')
      .insert({
        order_id,
        driver_id,
        status: 'pending',
      })
      .select()
      .single();

    if (assignError) throw assignError;

    // Update order with driver assignment
    await supabase
      .from('orders')
      .update({
        assigned_driver_id: driver_id,
        status: 'out_for_delivery',
      })
      .eq('id', order_id);

    // Update driver status to busy
    await supabase
      .from('drivers')
      .update({ status: 'busy' })
      .eq('id', driver_id);

    // Create geofence for customer location in Traccar
    if (order.customer_latitude && order.customer_longitude) {
      try {
        const geofence = await traccar.createCircularGeofence(
          `Customer-${order.order_number}`,
          order.customer_latitude,
          order.customer_longitude,
          100 // 100 meter radius
        );

        await supabase
          .from('orders')
          .update({ customer_geofence_id: geofence.id })
          .eq('id', order_id);
      } catch (e) {
        console.error('Geofence creation failed:', e);
      }
    }

    return NextResponse.json({
      success: true,
      assignment,
      message: 'Driver assigned successfully',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Assignment error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to assign driver' },
      { status: 500 }
    );
  }
}
