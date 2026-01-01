// Admin endpoint for managing delivery regions
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { z } from 'zod';

// GeoJSON Polygon schema for geofence coordinates
const geoJSONPolygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(z.array(z.number()))),
}).nullable().optional();

const regionSchema = z.object({
  group_id: z.string().uuid().optional().or(z.literal('')).or(z.null()).transform(val => val === '' ? null : val),
  name: z.string().min(1, 'Region name is required'),
  description: z.string().optional().or(z.literal('')).transform(val => val === '' ? null : val),
  delivery_fee: z.number().min(0, 'Delivery fee must be 0 or greater'),
  free_delivery_threshold: z.number().min(0).nullable().optional().or(z.literal(null)),
  display_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
  geofence_coordinates: geoJSONPolygonSchema,
});

// GET - Fetch all regions (including inactive) for admin
export async function GET() {
  try {
    const supabase = createServiceClient();

    // Fetch all region groups
    const { data: groups, error: groupsError } = await supabase
      .from('delivery_region_groups')
      .select('*')
      .order('display_order', { ascending: true });

    if (groupsError) {
      console.error('Error fetching region groups:', groupsError);
      return NextResponse.json(
        { error: 'Failed to fetch region groups' },
        { status: 500 }
      );
    }

    // Fetch all regions
    const { data: regions, error: regionsError } = await supabase
      .from('delivery_regions')
      .select('*')
      .order('display_order', { ascending: true });

    if (regionsError) {
      console.error('Error fetching regions:', regionsError);
      return NextResponse.json(
        { error: 'Failed to fetch regions' },
        { status: 500 }
      );
    }

    // Group regions by their group_id
    const groupedData = (groups || []).map((group: any) => ({
      ...group,
      regions: (regions || []).filter((region: any) => region.group_id === group.id),
    }));

    // Include ungrouped regions
    const ungroupedRegions = (regions || []).filter((region: any) => !region.group_id);

    return NextResponse.json({
      groups: groupedData,
      ungrouped: ungroupedRegions,
      all_regions: regions || [],
      all_groups: groups || [],
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// POST - Create a new region
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();

    const validation = regionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { data: region, error } = await supabase
      .from('delivery_regions')
      .insert({
        group_id: validation.data.group_id || null,
        name: validation.data.name,
        description: validation.data.description || null,
        delivery_fee: validation.data.delivery_fee,
        free_delivery_threshold: validation.data.free_delivery_threshold || null,
        display_order: validation.data.display_order || 0,
        is_active: validation.data.is_active ?? true,
        geofence_coordinates: validation.data.geofence_coordinates || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating region:', error);
      return NextResponse.json(
        { error: 'Failed to create region' },
        { status: 500 }
      );
    }

    return NextResponse.json({ region }, { status: 201 });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
