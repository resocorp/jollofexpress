import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';
import { getLatestPosition } from '@/lib/traccar/client';

export const dynamic = 'force-dynamic';

// GET - Fetch driver's latest position from Traccar and sync to DB
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ driverId: string }> }
) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const { driverId } = await params;
    const supabase = createServiceClient();

    // Get driver record with traccar_device_id
    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('id, name, traccar_device_id, current_latitude, current_longitude, last_location_update')
      .eq('id', driverId)
      .single();

    if (driverError || !driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    if (!driver.traccar_device_id) {
      // No Traccar device linked — return DB-cached position if available
      if (driver.current_latitude && driver.current_longitude) {
        return NextResponse.json({
          latitude: driver.current_latitude,
          longitude: driver.current_longitude,
          lastUpdate: driver.last_location_update,
          source: 'cached',
        });
      }
      return NextResponse.json({ error: 'No tracking device linked to driver' }, { status: 404 });
    }

    // Fetch latest position from Traccar
    try {
      const position = await getLatestPosition(driver.traccar_device_id);

      if (!position) {
        // Return cached position if Traccar has nothing
        if (driver.current_latitude && driver.current_longitude) {
          return NextResponse.json({
            latitude: driver.current_latitude,
            longitude: driver.current_longitude,
            lastUpdate: driver.last_location_update,
            source: 'cached',
          });
        }
        return NextResponse.json({ error: 'No position data available' }, { status: 404 });
      }

      // Update driver's cached position in DB
      await supabase
        .from('drivers')
        .update({
          current_latitude: position.latitude,
          current_longitude: position.longitude,
          last_location_update: position.serverTime || new Date().toISOString(),
        })
        .eq('id', driverId);

      return NextResponse.json({
        latitude: position.latitude,
        longitude: position.longitude,
        speed: position.speed,
        accuracy: position.accuracy,
        lastUpdate: position.serverTime,
        source: 'traccar',
      });
    } catch (traccarError) {
      console.error('Traccar fetch failed, using cached position:', traccarError);

      // Fallback to cached position
      if (driver.current_latitude && driver.current_longitude) {
        return NextResponse.json({
          latitude: driver.current_latitude,
          longitude: driver.current_longitude,
          lastUpdate: driver.last_location_update,
          source: 'cached',
        });
      }
      return NextResponse.json({ error: 'Tracking server unavailable' }, { status: 503 });
    }
  } catch (error) {
    console.error('Error in driver position endpoint:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
