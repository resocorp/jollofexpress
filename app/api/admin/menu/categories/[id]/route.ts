// Admin endpoints for individual category operations
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const categoryUpdateSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  description: z.string().max(200).optional(),
  image_url: z.string().url().optional(),
  display_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

// PATCH - Update category
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate
    const validation = categoryUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Update category
    const { data: category, error } = await supabase
      .from('menu_categories')
      .update(validation.data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating category:', error);
      return NextResponse.json(
        { error: 'Failed to update category' },
        { status: 500 }
      );
    }

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(category);

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// DELETE - Delete category
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check if category has items
    const { data: items } = await supabase
      .from('menu_items')
      .select('id')
      .eq('category_id', id)
      .limit(1);

    if (items && items.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category with items. Please delete or move items first.' },
        { status: 400 }
      );
    }

    // Delete category
    const { error } = await supabase
      .from('menu_categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting category:', error);
      return NextResponse.json(
        { error: 'Failed to delete category' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Category deleted successfully' });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
