// Admin endpoint for managing individual delivery regions
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { z } from 'zod';

// GeoJSON Polygon schema for geofence coordinates
const geoJSONPolygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(z.array(z.number()))),
}).nullable().optional();

const updateRegionSchema = z.object({
  group_id: z.string().uuid().optional().or(z.literal('')).or(z.null()).transform(val => val === '' ? null : val),
  name: z.string().min(1, 'Region name is required').optional(),
  description: z.string().optional().or(z.literal('')).transform(val => val === '' ? null : val),
  delivery_fee: z.number().min(0, 'Delivery fee must be 0 or greater').optional(),
  free_delivery_threshold: z.number().min(0).nullable().optional().or(z.literal(null)),
  display_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
  geofence_coordinates: geoJSONPolygonSchema,
});

// GET - Fetch a single region
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    const { data: region, error } = await supabase
      .from('delivery_regions')
      .select('*, group:delivery_region_groups(*)')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching region:', error);
      return NextResponse.json(
        { error: 'Region not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ region });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// PATCH - Update a region
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();
    const body = await request.json();

    console.log('[PATCH Region] Request body:', JSON.stringify(body, null, 2));

    const validation = updateRegionSchema.safeParse(body);
    if (!validation.success) {
      console.error('[PATCH Region] Validation failed:', validation.error.flatten());
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    console.log('[PATCH Region] Validated data:', JSON.stringify(validation.data, null, 2));

    const updateData: Record<string, any> = {};
    if (validation.data.group_id !== undefined) updateData.group_id = validation.data.group_id;
    if (validation.data.name !== undefined) updateData.name = validation.data.name;
    if (validation.data.description !== undefined) updateData.description = validation.data.description;
    if (validation.data.delivery_fee !== undefined) updateData.delivery_fee = validation.data.delivery_fee;
    if (validation.data.free_delivery_threshold !== undefined) updateData.free_delivery_threshold = validation.data.free_delivery_threshold;
    if (validation.data.display_order !== undefined) updateData.display_order = validation.data.display_order;
    if (validation.data.is_active !== undefined) updateData.is_active = validation.data.is_active;
    if (validation.data.geofence_coordinates !== undefined) updateData.geofence_coordinates = validation.data.geofence_coordinates;

    console.log('[PATCH Region] Update data:', JSON.stringify(updateData, null, 2));

    const { data: region, error } = await supabase
      .from('delivery_regions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[PATCH Region] Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to update region', details: error.message },
        { status: 500 }
      );
    }

    console.log('[PATCH Region] Success:', region);
    return NextResponse.json({ region });

  } catch (error: any) {
    console.error('[PATCH Region] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error?.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete a region
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    const { error } = await supabase
      .from('delivery_regions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting region:', error);
      return NextResponse.json(
        { error: 'Failed to delete region' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
