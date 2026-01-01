// API endpoint to detect delivery region from GPS coordinates
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as turf from '@turf/turf';
import { z } from 'zod';

const detectSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

// POST /api/delivery/regions/detect - Detect region from GPS coordinates
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = detectSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid coordinates', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { latitude, longitude } = validation.data;
    const supabase = await createClient();

    // Fetch all active regions with geofence coordinates
    const { data: regions, error } = await supabase
      .from('delivery_regions')
      .select('*')
      .eq('is_active', true)
      .not('geofence_coordinates', 'is', null);

    if (error) {
      console.error('Error fetching regions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch regions' },
        { status: 500 }
      );
    }

    if (!regions || regions.length === 0) {
      return NextResponse.json({
        detected: false,
        message: 'No regions with geofence data found',
        region: null,
      });
    }

    // Create a point from the user's coordinates
    const userPoint = turf.point([longitude, latitude]);

    // Check each region's polygon to see if the point is inside
    for (const region of regions) {
      const geofence = region.geofence_coordinates as {
        type: string;
        coordinates: number[][][];
      } | null;

      if (!geofence || geofence.type !== 'Polygon' || !geofence.coordinates) {
        continue;
      }

      try {
        // Create polygon from geofence coordinates
        const polygon = turf.polygon(geofence.coordinates);
        
        // Check if point is inside polygon
        if (turf.booleanPointInPolygon(userPoint, polygon)) {
          return NextResponse.json({
            detected: true,
            region: {
              id: region.id,
              name: region.name,
              delivery_fee: region.delivery_fee,
              free_delivery_threshold: region.free_delivery_threshold,
              group_id: region.group_id,
            },
          });
        }
      } catch (e) {
        // Invalid polygon, skip
        console.error(`Invalid polygon for region ${region.id}:`, e);
        continue;
      }
    }

    // No matching region found
    return NextResponse.json({
      detected: false,
      message: 'Location not within any delivery zone',
      region: null,
    });

  } catch (error: any) {
    console.error('Region detection error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to detect region' },
      { status: 500 }
    );
  }
}
