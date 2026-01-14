// Vehicles API - Company bikes management
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdminAuth, verifyAdminOnly } from '@/lib/auth/admin-auth';
import * as traccar from '@/lib/traccar/client';

// GET /api/vehicles - List all vehicles
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
    
    // Fetch devices from Traccar to get online/offline status
    let traccarDevices: any[] = [];
    let traccarPositions: Map<number, any> = new Map();
    try {
      traccarDevices = await traccar.getDevices();
      const positions = await traccar.getPositions();
      traccarPositions = new Map(positions.map(p => [p.deviceId, p]));
    } catch (e) {
      console.error('Failed to fetch Traccar data:', e);
    }
    
    // Create a map of device status from Traccar
    const deviceStatusMap = new Map(
      traccarDevices.map(d => [d.id, d.status])
    );
    
    let query = supabase
      .from('vehicles')
      .select(`
        *,
        current_driver:drivers(id, name, phone)
      `)
      .eq('is_active', true)
      .order('name');
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (available === 'true') {
      query = query.eq('status', 'available');
    }
    
    const { data: vehicles, error } = await query;
    
    if (error) throw error;
    
    // Enrich with Traccar status and live location
    const enrichedVehicles = (vehicles || []).map((vehicle) => {
      const traccarStatus = vehicle.traccar_device_id 
        ? deviceStatusMap.get(vehicle.traccar_device_id) 
        : null;
      const position = vehicle.traccar_device_id 
        ? traccarPositions.get(vehicle.traccar_device_id) 
        : null;
      
      // Determine effective status
      // If Traccar says offline, vehicle is offline (regardless of DB status)
      // Unless it's currently in use by a driver
      let effectiveStatus = vehicle.status;
      if (traccarStatus === 'offline' && vehicle.status !== 'in_use') {
        effectiveStatus = 'offline';
      } else if (traccarStatus === 'online' && vehicle.status === 'offline') {
        effectiveStatus = 'available';
      }
      
      return {
        ...vehicle,
        status: effectiveStatus,
        traccar_status: traccarStatus || 'unknown',
        live_location: position ? {
          latitude: position.latitude,
          longitude: position.longitude,
          speed: position.speed,
          updated: position.deviceTime,
        } : null,
      };
    });
    
    return NextResponse.json(enrichedVehicles);
  } catch (error: any) {
    console.error('Error fetching vehicles:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch vehicles' },
      { status: 500 }
    );
  }
}

// POST /api/vehicles/sync - Sync vehicles from Traccar
export async function POST(request: NextRequest) {
  // Verify admin-only authentication (sync is admin action)
  const authResult = await verifyAdminOnly(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const devices = await traccar.getDevices();
    const supabase = createServiceClient();
    
    let synced = 0;
    let updated = 0;
    
    for (const device of devices) {
      // Check if vehicle already exists
      const { data: existing } = await supabase
        .from('vehicles')
        .select('id')
        .eq('traccar_device_id', device.id)
        .single();
      
      if (existing) {
        // Update existing
        await supabase
          .from('vehicles')
          .update({
            name: device.name,
            traccar_unique_id: device.uniqueId,
            updated_at: new Date().toISOString(),
          })
          .eq('traccar_device_id', device.id);
        updated++;
      } else {
        // Create new
        await supabase
          .from('vehicles')
          .insert({
            name: device.name,
            traccar_device_id: device.id,
            traccar_unique_id: device.uniqueId,
            plate_number: device.phone || null,
            status: 'available',
          });
        synced++;
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Synced ${synced} new vehicles, updated ${updated} existing`,
      synced,
      updated,
      total: devices.length,
    });
  } catch (error: any) {
    console.error('Traccar sync error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync vehicles from Traccar' },
      { status: 500 }
    );
  }
}
