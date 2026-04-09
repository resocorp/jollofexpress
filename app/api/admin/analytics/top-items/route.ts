import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';

export const dynamic = 'force-dynamic';

interface VariationBreakdown {
  option: string;
  quantity: number;
  revenue: number;
}

interface TopItemData {
  itemName: string;
  quantity: number;
  revenue: number;
  variations?: VariationBreakdown[];
}

interface TopAddonData {
  addonName: string;
  quantity: number;
}

export async function GET(request: NextRequest) {
  // Verify authentication
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days
    const limit = parseInt(searchParams.get('limit') || '10');
    const periodDays = parseInt(period);

    const supabase = createServiceClient();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Fetch order items with their orders (include variation and addon data)
    const { data: orderItems, error } = await supabase
      .from('order_items')
      .select(`
        item_name,
        quantity,
        subtotal,
        selected_variation,
        selected_addons,
        order_id,
        orders!inner(created_at, status)
      `)
      .gte('orders.created_at', startDate.toISOString())
      .in('orders.status', ['completed', 'ready', 'out_for_delivery', 'preparing', 'confirmed']);

    if (error) throw error;

    // Aggregate by base item name (strip variation suffix like "Shawarma - Hot Dog" → "Shawarma")
    const itemMap = new Map<string, {
      quantity: number;
      revenue: number;
      variations: Map<string, { quantity: number; revenue: number }>;
    }>();

    // Aggregate addon frequency
    const addonMap = new Map<string, number>();

    orderItems?.forEach((item: any) => {
      // Determine base item name: strip " - VariationOption" suffix if present
      const variationOption = item.selected_variation?.option;
      let baseName = item.item_name;
      if (variationOption && baseName.endsWith(` - ${variationOption}`)) {
        baseName = baseName.slice(0, -(` - ${variationOption}`.length));
      }

      const existing = itemMap.get(baseName) || {
        quantity: 0,
        revenue: 0,
        variations: new Map<string, { quantity: number; revenue: number }>(),
      };

      existing.quantity += item.quantity;
      existing.revenue += Number(item.subtotal);

      // Track variation breakdown
      if (variationOption) {
        const varExisting = existing.variations.get(variationOption) || { quantity: 0, revenue: 0 };
        varExisting.quantity += item.quantity;
        varExisting.revenue += Number(item.subtotal);
        existing.variations.set(variationOption, varExisting);
      }

      itemMap.set(baseName, existing);

      // Track addon frequency
      if (item.selected_addons && Array.isArray(item.selected_addons)) {
        item.selected_addons.forEach((addon: any) => {
          const addonQty = addon.quantity || 1;
          const count = addonMap.get(addon.name) || 0;
          addonMap.set(addon.name, count + (item.quantity * addonQty));
        });
      }
    });

    // Convert to array and sort by quantity
    const topItems: TopItemData[] = Array.from(itemMap.entries())
      .map(([itemName, data]) => {
        const result: TopItemData = {
          itemName,
          quantity: data.quantity,
          revenue: data.revenue,
        };
        if (data.variations.size > 0) {
          result.variations = Array.from(data.variations.entries())
            .map(([option, vData]) => ({
              option,
              quantity: vData.quantity,
              revenue: vData.revenue,
            }))
            .sort((a, b) => b.quantity - a.quantity);
        }
        return result;
      })
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, limit);

    // Top addons
    const topAddons: TopAddonData[] = Array.from(addonMap.entries())
      .map(([addonName, quantity]) => ({ addonName, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    return NextResponse.json({ topItems, topAddons });
  } catch (error) {
    console.error('Error fetching top items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top items' },
      { status: 500 }
    );
  }
}
