// Driver Shifts API - Check-in/Check-out with vehicles
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';
import { z } from 'zod';

const startShiftSchema = z.object({
  driver_id: z.string().uuid(),
  vehicle_id: z.string().uuid(),
});

const endShiftSchema = z.object({
  driver_id: z.string().uuid(),
});

// GET /api/drivers/shifts - Get active shifts
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
    
    let query = supabase
      .from('driver_shifts')
      .select(`
        *,
        driver:drivers(id, name, phone, status),
        vehicle:vehicles(id, name, plate_number, traccar_device_id)
      `)
      .is('ended_at', null)
      .order('started_at', { ascending: false });
    
    if (driverId) {
      query = query.eq('driver_id', driverId);
    }
    
    const { data: shifts, error } = await query;
    
    if (error) throw error;
    
    return NextResponse.json(shifts);
  } catch (error: any) {
    console.error('Error fetching shifts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch shifts' },
      { status: 500 }
    );
  }
}

// POST /api/drivers/shifts - Start a new shift (check-in)
export async function POST(request: NextRequest) {
  // Verify authentication
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const { driver_id, vehicle_id } = startShiftSchema.parse(body);
    
    const supabase = createServiceClient();
    
    // Check if vehicle is available
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', vehicle_id)
      .single();
    
    if (vehicleError || !vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }
    
    if (vehicle.status === 'in_use' && vehicle.current_driver_id !== driver_id) {
      return NextResponse.json(
        { error: 'Vehicle is currently in use by another driver' },
        { status: 400 }
      );
    }
    
    if (vehicle.status === 'maintenance') {
      return NextResponse.json(
        { error: 'Vehicle is under maintenance' },
        { status: 400 }
      );
    }
    
    // Use the database function to start shift
    const { data: shiftId, error: shiftError } = await supabase
      .rpc('start_driver_shift', {
        p_driver_id: driver_id,
        p_vehicle_id: vehicle_id,
      });
    
    if (shiftError) throw shiftError;
    
    // Fetch the created shift with relations
    const { data: shift } = await supabase
      .from('driver_shifts')
      .select(`
        *,
        driver:drivers(id, name, phone, status),
        vehicle:vehicles(id, name, plate_number, traccar_device_id)
      `)
      .eq('id', shiftId)
      .single();
    
    return NextResponse.json({
      success: true,
      shift,
      message: 'Shift started successfully',
    }, { status: 201 });
    
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error starting shift:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start shift' },
      { status: 500 }
    );
  }
}

// DELETE /api/drivers/shifts - End shift (check-out)
export async function DELETE(request: NextRequest) {
  // Verify authentication
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const { driver_id } = endShiftSchema.parse(body);
    
    const supabase = createServiceClient();
    
    // Use the database function to end shift
    const { error } = await supabase
      .rpc('end_driver_shift', {
        p_driver_id: driver_id,
      });
    
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      message: 'Shift ended successfully',
    });
    
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error ending shift:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to end shift' },
      { status: 500 }
    );
  }
}
