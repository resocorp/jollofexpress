// Supabase query helpers to handle common patterns and RLS issues
import { SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import type { Order, OrderItem, OrderWithItems } from '@/types/database';

interface QueryResult<T> {
  data: T | null;
  error: PostgrestError | null;
}

/**
 * Group order items by their order_id into a lookup map
 */
function groupItemsByOrderId(items: OrderItem[]): Record<string, OrderItem[]> {
  return items.reduce<Record<string, OrderItem[]>>((acc, item) => {
    if (!item) return acc;
    if (!acc[item.order_id]) {
      acc[item.order_id] = [];
    }
    acc[item.order_id].push(item);
    return acc;
  }, {});
}

/**
 * Fetch a single order with its items
 * Handles RLS issues by fetching order and items separately
 */
export async function fetchOrderWithItems(
  supabase: SupabaseClient,
  orderId: string
): Promise<QueryResult<OrderWithItems>> {
  // Fetch order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return { data: null, error: orderError };
  }

  // Fetch order items separately
  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId);

  if (itemsError) {
    console.error('Error fetching order items:', itemsError);
  }

  // Combine and filter out null/undefined items
  const orderWithItems: OrderWithItems = {
    ...order,
    items: items?.filter(item => item != null) || []
  };

  return { data: orderWithItems, error: null };
}

/**
 * Fetch multiple orders with their items
 * Handles RLS issues by fetching orders and items separately
 */
export async function fetchOrdersWithItems(
  supabase: SupabaseClient,
  query: PromiseLike<{ data: Order[] | null; error: PostgrestError | null }>
): Promise<QueryResult<OrderWithItems[]>> {
  // Execute the query to get orders
  const { data: orders, error: ordersError } = await query;

  if (ordersError || !orders) {
    return { data: null, error: ordersError };
  }

  if (orders.length === 0) {
    return { data: [], error: null };
  }

  // Fetch all order items for these orders
  const orderIds = orders.map((o) => o.id);
  const { data: allItems, error: itemsError } = await supabase
    .from('order_items')
    .select('*')
    .in('order_id', orderIds);

  if (itemsError) {
    console.error('Error fetching order items:', itemsError);
  }

  // Group items by order_id
  const itemsByOrderId = groupItemsByOrderId((allItems || []) as OrderItem[]);

  // Combine orders with their items
  const ordersWithItems: OrderWithItems[] = orders.map((order) => ({
    ...order,
    items: itemsByOrderId[order.id] || []
  }));

  return { data: ordersWithItems, error: null };
}
