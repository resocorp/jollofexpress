// Public endpoint to fetch complete menu with categories, items, variations, and addons
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Fetch active categories with their items
    const { data: categories, error: categoriesError } = await supabase
      .from('menu_categories')
      .select(`
        id,
        name,
        description,
        display_order,
        image_url
      `)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError);
      return NextResponse.json(
        { error: 'Failed to fetch menu categories' },
        { status: 500 }
      );
    }

    // Fetch all menu items for the categories
    const categoryIds = categories.map(cat => cat.id);
    
    const { data: items, error: itemsError } = await supabase
      .from('menu_items')
      .select(`
        id,
        category_id,
        name,
        description,
        base_price,
        promo_price,
        image_url,
        is_available,
        dietary_tag,
        display_order
      `)
      .in('category_id', categoryIds)
      .eq('is_available', true)
      .order('display_order', { ascending: true });

    if (itemsError) {
      console.error('Error fetching items:', itemsError);
      return NextResponse.json(
        { error: 'Failed to fetch menu items' },
        { status: 500 }
      );
    }

    // Fetch variations for all items
    const itemIds = items.map(item => item.id);
    
    const { data: variations, error: variationsError } = await supabase
      .from('item_variations')
      .select('*')
      .in('item_id', itemIds);

    if (variationsError) {
      console.error('Error fetching variations:', variationsError);
    }

    // Fetch addons for all items
    const { data: addons, error: addonsError } = await supabase
      .from('item_addons')
      .select('*')
      .in('item_id', itemIds)
      .eq('is_available', true);

    if (addonsError) {
      console.error('Error fetching addons:', addonsError);
    }

    // Organize data into nested structure
    const menu = categories.map(category => ({
      ...category,
      items: items
        .filter(item => item.category_id === category.id)
        .map(item => ({
          ...item,
          variations: variations?.filter(v => v.item_id === item.id) || [],
          addons: addons?.filter(a => a.item_id === item.id) || [],
        })),
    }));

    return NextResponse.json({
      categories: menu,
    });

  } catch (error) {
    console.error('Unexpected error in /api/menu:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
