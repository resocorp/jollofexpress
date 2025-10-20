// Admin endpoints for individual menu item operations
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const itemUpdateSchema = z.object({
  category_id: z.string().uuid().optional(),
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  base_price: z.number().positive().optional(),
  image_url: z.string().url().optional(),
  is_available: z.boolean().optional(),
  dietary_tag: z.enum(['veg', 'non_veg', 'vegan', 'gluten_free']).optional(),
  display_order: z.number().int().min(0).optional(),
});

// PATCH - Update item
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate
    const validation = itemUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // If category_id is being changed, verify it exists
    if (validation.data.category_id) {
      const { data: category } = await supabase
        .from('menu_categories')
        .select('id')
        .eq('id', validation.data.category_id)
        .single();

      if (!category) {
        return NextResponse.json(
          { error: 'Category not found' },
          { status: 404 }
        );
      }
    }

    // Update item
    const { data: item, error } = await supabase
      .from('menu_items')
      .update(validation.data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating item:', error);
      return NextResponse.json(
        { error: 'Failed to update item' },
        { status: 500 }
      );
    }

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(item);

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// DELETE - Delete item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Delete related variations and addons first (cascade should handle this, but being explicit)
    await supabase.from('item_variations').delete().eq('item_id', id);
    await supabase.from('item_addons').delete().eq('item_id', id);

    // Delete item
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting item:', error);
      return NextResponse.json(
        { error: 'Failed to delete item' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Item deleted successfully' });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
