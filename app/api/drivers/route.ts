// Driver management API
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdminAuth, verifyAdminOnly } from '@/lib/auth/admin-auth';
import * as traccar from '@/lib/traccar/client';
import { z } from 'zod';

const createDriverSchema = z.object({
  name: z.string().min(2),
  phone: z.string().regex(/^(\+234|0)[789]\d{9}$/),
  email: z.string().email().optional(),
  vehicle_type: z.string().default('motorcycle'),
  vehicle_plate: z.string().optional(),
  traccar_device_id: z.number().optional(),
});

// GET /api/drivers - List all drivers (requires admin/kitchen auth)
export async function GET(request: NextRequest) {
  // Verify authentication
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const available = searchParams.get('available');

    let query = supabase
      .from('drivers')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (status) {
      query = query.eq('status', status);
    }

    if (available === 'true') {
      query = query.eq('status', 'available');
    }

    const { data: drivers, error } = await query;

    if (error) throw error;

    return NextResponse.json(drivers);
  } catch (error: any) {
    console.error('Error fetching drivers:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch drivers' },
      { status: 500 }
    );
  }
}

// POST /api/drivers - Create new driver (requires admin-only auth)
export async function POST(request: NextRequest) {
  // Verify admin-only authentication (creating drivers is admin action)
  const authResult = await verifyAdminOnly(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const validatedData = createDriverSchema.parse(body);
    
    const supabase = createServiceClient();

    // Check if driver already exists
    const { data: existing } = await supabase
      .from('drivers')
      .select('id')
      .eq('phone', validatedData.phone)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'A driver with this phone number already exists' },
        { status: 400 }
      );
    }

    // Create driver in Traccar if device ID provided
    let traccarDriverId: number | undefined;
    if (validatedData.traccar_device_id) {
      try {
        const traccarDriver = await traccar.createDriver({
          name: validatedData.name,
          uniqueId: validatedData.phone.replace(/\D/g, ''),
        });
        traccarDriverId = traccarDriver.id;

        // Link device to driver in Traccar
        await traccar.linkDeviceToDriver(
          validatedData.traccar_device_id,
          traccarDriver.id
        );
      } catch (traccarError) {
        console.error('Traccar integration error:', traccarError);
        // Continue without Traccar integration
      }
    }

    // Create driver in database
    const { data: driver, error } = await supabase
      .from('drivers')
      .insert({
        name: validatedData.name,
        phone: validatedData.phone,
        email: validatedData.email,
        vehicle_type: validatedData.vehicle_type,
        vehicle_plate: validatedData.vehicle_plate,
        traccar_device_id: validatedData.traccar_device_id,
        traccar_driver_id: traccarDriverId,
        status: 'offline',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(driver, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid driver data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating driver:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create driver' },
      { status: 500 }
    );
  }
}
