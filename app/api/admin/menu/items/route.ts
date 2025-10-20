// Admin endpoints for menu item management
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Validation schema
const itemSchema = z.object({
  category_id: z.string().uuid(),
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  base_price: z.number().positive(),
  image_url: z.string().url().optional(),
  is_available: z.boolean().optional(),
  dietary_tag: z.enum(['veg', 'non_veg', 'vegan', 'gluten_free']).optional(),
  display_order: z.number().int().min(0).optional(),
});

// GET - List all items (optionally filtered by category)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get('category_id');

    const supabase = await createClient();

    let query = supabase
      .from('menu_items')
      .select(`
        *,
        category:menu_categories(id, name)
      `)
      .order('display_order', { ascending: true });

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data: items, error } = await query;

    if (error) {
      console.error('Error fetching items:', error);
      return NextResponse.json(
        { error: 'Failed to fetch items' },
        { status: 500 }
      );
    }

    return NextResponse.json(items || []);

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// POST - Create new item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate
    const validation = itemSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify category exists
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

    // If no display_order provided, get max + 1 for this category
    if (validation.data.display_order === undefined) {
      const { data: maxOrderData } = await supabase
        .from('menu_items')
        .select('display_order')
        .eq('category_id', validation.data.category_id)
        .order('display_order', { ascending: false })
        .limit(1)
        .single();

      validation.data.display_order = (maxOrderData?.display_order || 0) + 1;
    }

    // Insert item
    const { data: item, error } = await supabase
      .from('menu_items')
      .insert(validation.data)
      .select()
      .single();

    if (error) {
      console.error('Error creating item:', error);
      return NextResponse.json(
        { error: 'Failed to create item' },
        { status: 500 }
      );
    }

    return NextResponse.json(item, { status: 201 });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
