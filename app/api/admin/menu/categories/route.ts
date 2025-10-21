// Admin endpoints for menu category management
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { z } from 'zod';

// Validation schema
const categorySchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().max(200).optional(),
  image_url: z.string().url().optional(),
  display_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

// GET - List all categories
export async function GET() {
  try {
    const supabase = createServiceClient();

    const { data: categories, error } = await supabase
      .from('menu_categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error);
      return NextResponse.json(
        { error: 'Failed to fetch categories' },
        { status: 500 }
      );
    }

    return NextResponse.json(categories || []);

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// POST - Create new category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate
    const validation = categorySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // If no display_order provided, get max + 1
    if (validation.data.display_order === undefined) {
      const { data: maxOrderData } = await supabase
        .from('menu_categories')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1)
        .single();

      validation.data.display_order = (maxOrderData?.display_order || 0) + 1;
    }

    // Insert category
    const { data: category, error } = await supabase
      .from('menu_categories')
      .insert(validation.data)
      .select()
      .single();

    if (error) {
      console.error('Error creating category:', error);
      return NextResponse.json(
        { error: 'Failed to create category' },
        { status: 500 }
      );
    }

    return NextResponse.json(category, { status: 201 });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
