import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';
import { getDevices, getLatestPosition } from '@/lib/traccar/client';

export const dynamic = 'force-dynamic';

export interface TraccarVehiclePosition {
  deviceId: number;
  name: string;
  uniqueId: string;
  status: string; // 'online' | 'offline' | 'unknown'
  latitude: number | null;
  longitude: number | null;
  speed: number | null;
  lastUpdate: string | null;
}

// GET - Fetch all Traccar devices with their latest positions
export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const devices = await getDevices();

    // Fetch latest position for each device in parallel
    const positionResults = await Promise.all(
      devices.map(d => getLatestPosition(d.id).catch(() => null))
    );

    const vehicles: TraccarVehiclePosition[] = devices.map((device, i) => {
      const pos = positionResults[i];
      return {
        deviceId: device.id,
        name: device.name,
        uniqueId: device.uniqueId,
        status: device.status || 'unknown',
        latitude: pos?.latitude ?? null,
        longitude: pos?.longitude ?? null,
        speed: pos?.speed ?? null,
        lastUpdate: pos?.serverTime ?? device.lastUpdate ?? null,
      };
    });

    return NextResponse.json({ vehicles });
  } catch (error) {
    console.error('Error fetching Traccar vehicles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicles from tracking server' },
      { status: 503 }
    );
  }
}
