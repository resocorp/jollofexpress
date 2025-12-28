// Traccar Devices API - Sync company bikes from Traccar
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import * as traccar from '@/lib/traccar/client';

// GET /api/traccar/devices - List all devices from Traccar
export async function GET() {
  try {
    const devices = await traccar.getDevices();
    
    // Get positions for online status
    const positions = await traccar.getPositions();
    const positionMap = new Map(positions.map(p => [p.deviceId, p]));
    
    // Enrich devices with position data
    const enrichedDevices = devices.map(device => ({
      id: device.id,
      name: device.name,
      uniqueId: device.uniqueId,
      status: device.status,
      phone: device.phone,
      model: device.model,
      lastUpdate: device.lastUpdate,
      position: positionMap.get(device.id) ? {
        latitude: positionMap.get(device.id)!.latitude,
        longitude: positionMap.get(device.id)!.longitude,
        speed: positionMap.get(device.id)!.speed,
        updated: positionMap.get(device.id)!.deviceTime,
      } : null,
    }));
    
    return NextResponse.json(enrichedDevices);
  } catch (error: any) {
    console.error('Traccar devices fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch devices from Traccar' },
      { status: 500 }
    );
  }
}

// POST /api/traccar/devices/sync - Sync devices to local vehicles table
export async function POST() {
  try {
    const devices = await traccar.getDevices();
    const supabase = createServiceClient();
    
    let synced = 0;
    let skipped = 0;
    
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
            status: device.status === 'online' ? 'available' : 'offline',
            updated_at: new Date().toISOString(),
          })
          .eq('traccar_device_id', device.id);
        skipped++;
      } else {
        // Create new
        await supabase
          .from('vehicles')
          .insert({
            name: device.name,
            traccar_device_id: device.id,
            traccar_unique_id: device.uniqueId,
            plate_number: device.phone || null,
            status: device.status === 'online' ? 'available' : 'offline',
          });
        synced++;
      }
    }
    
    return NextResponse.json({
      success: true,
      synced,
      skipped,
      total: devices.length,
    });
  } catch (error: any) {
    console.error('Traccar sync error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync devices' },
      { status: 500 }
    );
  }
}
