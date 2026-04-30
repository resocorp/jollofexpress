// Kitchen-side menu fetch — returns every listed item regardless of stock,
// so the kitchen controls UI keeps showing items it has marked sold out.
// Mirrors /api/menu but skips the is_available filter.
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';

export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const supabase = createServiceClient();

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
        is_listed,
        dietary_tag,
        display_order
      `)
      .in('category_id', categoryIds)
      .eq('is_listed', true)
      .order('display_order', { ascending: true });

    if (itemsError) {
      console.error('Error fetching items:', itemsError);
      return NextResponse.json(
        { error: 'Failed to fetch menu items' },
        { status: 500 }
      );
    }

    const itemIds = items.map(item => item.id);

    const { data: variations } = await supabase
      .from('item_variations')
      .select('*')
      .in('item_id', itemIds);

    const { data: addons } = await supabase
      .from('item_addons')
      .select('*')
      .in('item_id', itemIds);

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
    console.error('Unexpected error in /api/kitchen/menu:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
