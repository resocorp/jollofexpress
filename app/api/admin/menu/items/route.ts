// Admin endpoints for menu item management
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { z } from 'zod';

// Validation schemas
const itemSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500),
  base_price: z.number().positive(),
  category_id: z.string().uuid(),
  image_url: z.string().optional(),
  is_available: z.boolean().optional(),
  dietary_tag: z.enum(['veg', 'non_veg', 'vegan', 'gluten_free']).optional(),
  display_order: z.number().int().min(0).optional(),
});

const variationSchema = z.object({
  variation_name: z.string().min(1),
  options: z.array(z.object({
    name: z.string().min(1),
    price_adjustment: z.number(),
  })).min(1),
});

const addonSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
  is_available: z.boolean().optional(),
});

// GET - List all items (optionally filtered by category)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category_id = searchParams.get('category_id');

    const supabase = createServiceClient();

    // Join with menu_categories to get category name
    let query = supabase
      .from('menu_items')
      .select(`
        *,
        menu_categories!menu_items_category_id_fkey(
          id,
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (category_id) {
      query = query.eq('category_id', category_id);
    }

    const { data: items, error } = await query;

    if (error) {
      console.error('Error fetching items:', error);
      return NextResponse.json(
        { error: 'Failed to fetch items' },
        { status: 500 }
      );
    }

    // Transform data to flatten category info
    const transformedItems = items?.map(item => ({
      ...item,
      category: item.menu_categories?.name || 'Uncategorized',
      category_name: item.menu_categories?.name || 'Uncategorized',
    })) || [];

    console.log('📊 Fetched items:', transformedItems.length);
    return NextResponse.json(transformedItems);

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
    const { variations, addons, ...itemData } = body;

    console.log('📝 Creating menu item:', {
      name: itemData.name,
      category_id: itemData.category_id,
      base_price: itemData.base_price,
      variations_count: variations?.length || 0,
      addons_count: addons?.length || 0,
    });

    // Validate item
    const validation = itemSchema.safeParse(itemData);
    if (!validation.success) {
      console.error('❌ Validation failed:', validation.error.issues);
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Insert item
    const { data: item, error: itemError } = await supabase
      .from('menu_items')
      .insert(validation.data)
      .select()
      .single();

    if (itemError || !item) {
      console.error('❌ Error creating item:', itemError);
      return NextResponse.json(
        { error: 'Failed to create item', details: itemError?.message },
        { status: 500 }
      );
    }

    console.log('✅ Item created:', { id: item.id, name: item.name, category_id: item.category_id });

    // Insert variations if provided
    if (variations && Array.isArray(variations) && variations.length > 0) {
      const variationInserts = variations.map((v: any) => ({
        item_id: item.id,
        variation_name: v.variation_name,
        options: v.options,
      }));

      const { error: varError } = await supabase
        .from('item_variations')
        .insert(variationInserts);

      if (varError) {
        console.error('❌ Error creating variations:', varError);
      } else {
        console.log(`✅ Created ${variations.length} variations`);
      }
    }

    // Insert add-ons if provided
    if (addons && Array.isArray(addons) && addons.length > 0) {
      const addonInserts = addons.map((a: any) => ({
        item_id: item.id,
        name: a.name,
        price: a.price,
        is_available: a.is_available ?? true,
      }));

      const { error: addonError } = await supabase
        .from('item_addons')
        .insert(addonInserts);

      if (addonError) {
        console.error('❌ Error creating add-ons:', addonError);
      } else {
        console.log(`✅ Created ${addons.length} add-ons`);
      }
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
