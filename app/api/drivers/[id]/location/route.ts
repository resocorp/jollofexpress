// Driver location API - fetches real-time location from Traccar via active shift's vehicle
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import * as traccar from '@/lib/traccar/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/drivers/[id]/location - Get driver's current location
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    // Get driver from database
    const { data: driver, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    // Get active shift with vehicle info
    const { data: activeShift } = await supabase
      .from('driver_shifts')
      .select(`
        *,
        vehicle:vehicles(id, name, traccar_device_id)
      `)
      .eq('driver_id', id)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    // Get Traccar device ID from active shift's vehicle
    const traccarDeviceId = activeShift?.vehicle?.traccar_device_id || driver.traccar_device_id;

    // If we have a Traccar device, get live location
    if (traccarDeviceId) {
      try {
        const position = await traccar.getLatestPosition(traccarDeviceId);
        
        if (position) {
          // Update driver location in database (cache)
          await supabase
            .from('drivers')
            .update({
              current_latitude: position.latitude,
              current_longitude: position.longitude,
              last_location_update: new Date().toISOString(),
            })
            .eq('id', id);

          // Also update vehicle location
          if (activeShift?.vehicle?.id) {
            await supabase
              .from('vehicles')
              .update({
                current_latitude: position.latitude,
                current_longitude: position.longitude,
                last_location_update: new Date().toISOString(),
              })
              .eq('id', activeShift.vehicle.id);
          }

          return NextResponse.json({
            latitude: position.latitude,
            longitude: position.longitude,
            speed: position.speed,
            course: position.course,
            updated_at: position.deviceTime,
            source: 'traccar',
            vehicle: activeShift?.vehicle?.name,
          });
        }
      } catch (traccarError) {
        console.error('Traccar fetch error:', traccarError);
        // Fall through to cached location
      }
    }

    // Return cached location from database
    if (driver.current_latitude && driver.current_longitude) {
      return NextResponse.json({
        latitude: driver.current_latitude,
        longitude: driver.current_longitude,
        updated_at: driver.last_location_update,
        source: 'cached',
        vehicle: activeShift?.vehicle?.name,
      });
    }

    return NextResponse.json(
      { error: 'No location data available' },
      { status: 404 }
    );
  } catch (error: any) {
    console.error('Location fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch location' },
      { status: 500 }
    );
  }
}
