// Admin endpoints for individual menu item operations
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';
import { z } from 'zod';

const itemUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  base_price: z.number().positive().optional(),
  category_id: z.string().uuid().optional(),
  image_url: z.string().optional(),
  is_available: z.boolean().optional(),
  dietary_tag: z.enum(['veg', 'non_veg', 'vegan', 'gluten_free']).optional(),
  display_order: z.number().int().min(0).optional(),
});

// GET - Fetch single item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify authentication
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const { id } = await params;
    console.log('🔍 Fetching item:', id);
    
    const supabase = createServiceClient();

    // Fetch item with category
    const { data: item, error } = await supabase
      .from('menu_items')
      .select(`
        *,
        menu_categories!menu_items_category_id_fkey(
          id,
          name
        )
      `)
      .eq('id', id)
      .single();

    if (error || !item) {
      console.error('❌ Error fetching item:', error);
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    console.log('✅ Item found:', { id: item.id, name: item.name });
    return NextResponse.json(item);

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// PATCH - Update item
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify authentication
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { variations, addons, ...itemData } = body;

    console.log('💾 Updating item:', { id, data: itemData });

    // Remove empty strings for optional UUID fields
    if (itemData.category_id === '') {
      delete itemData.category_id;
    }

    // Validate
    const validation = itemUpdateSchema.safeParse(itemData);
    if (!validation.success) {
      console.error('❌ Validation failed:', validation.error.issues);
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Update item
    const { data: item, error } = await supabase
      .from('menu_items')
      .update(validation.data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating item:', error);
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

    console.log('✅ Item updated:', { id: item.id, name: item.name });

    // Update variations if provided
    if (variations && Array.isArray(variations)) {
      // Delete existing variations
      await supabase
        .from('item_variations')
        .delete()
        .eq('item_id', id);

      // Insert new variations
      if (variations.length > 0) {
        const variationInserts = variations.map((v: any) => ({
          item_id: id,
          variation_name: v.variation_name,
          options: v.options,
        }));

        const { error: varError } = await supabase
          .from('item_variations')
          .insert(variationInserts);

        if (varError) {
          console.error('❌ Error updating variations:', varError);
        } else {
          console.log(`✅ Updated ${variations.length} variations`);
        }
      }
    }

    // Update add-ons if provided
    if (addons && Array.isArray(addons)) {
      // Delete existing add-ons
      await supabase
        .from('item_addons')
        .delete()
        .eq('item_id', id);

      // Insert new add-ons
      if (addons.length > 0) {
        const addonInserts = addons.map((a: any) => ({
          item_id: id,
          name: a.name,
          price: a.price,
          is_available: a.is_available ?? true,
        }));

        const { error: addonError } = await supabase
          .from('item_addons')
          .insert(addonInserts);

        if (addonError) {
          console.error('❌ Error updating add-ons:', addonError);
        } else {
          console.log(`✅ Updated ${addons.length} add-ons`);
        }
      }
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
  // Verify authentication
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const { id } = await params;
    const supabase = createServiceClient();

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
