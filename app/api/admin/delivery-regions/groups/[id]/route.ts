// Admin endpoint for managing individual delivery region groups
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { z } from 'zod';

const updateGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').optional(),
  description: z.string().nullable().optional(),
  display_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

// PATCH - Update a region group
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();
    const body = await request.json();

    const validation = updateGroupSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const updateData: Record<string, any> = {};
    if (validation.data.name !== undefined) updateData.name = validation.data.name;
    if (validation.data.description !== undefined) updateData.description = validation.data.description;
    if (validation.data.display_order !== undefined) updateData.display_order = validation.data.display_order;
    if (validation.data.is_active !== undefined) updateData.is_active = validation.data.is_active;

    const { data: group, error } = await supabase
      .from('delivery_region_groups')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating region group:', error);
      return NextResponse.json(
        { error: 'Failed to update region group' },
        { status: 500 }
      );
    }

    return NextResponse.json({ group });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a region group
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    const { error } = await supabase
      .from('delivery_region_groups')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting region group:', error);
      return NextResponse.json(
        { error: 'Failed to delete region group' },
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
