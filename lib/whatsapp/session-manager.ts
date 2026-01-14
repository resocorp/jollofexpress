// WhatsApp Session Manager - Handles session CRUD and state persistence

import { createServiceClient } from '@/lib/supabase/service';
import type { 
  WhatsAppSession, 
  ConversationState, 
  CartItem, 
  MessageContext,
  ReturningCustomerData 
} from './types';

/**
 * Get or create a WhatsApp session for a phone number
 */
export async function getOrCreateSession(phone: string): Promise<WhatsAppSession> {
  const supabase = createServiceClient();
  
  // Try to find existing session
  const { data: existing } = await supabase
    .from('whatsapp_sessions')
    .select('*')
    .eq('phone', phone)
    .single();
  
  if (existing) {
    // Update last activity
    await supabase
      .from('whatsapp_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', existing.id);
    
    return {
      ...existing,
      cart: existing.cart || [],
      message_context: existing.message_context || {},
    } as WhatsAppSession;
  }
  
  // Create new session
  const { data: newSession, error } = await supabase
    .from('whatsapp_sessions')
    .insert({
      phone,
      state: 'IDLE',
      cart: [],
      message_context: {},
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating WhatsApp session:', error);
    throw new Error('Failed to create session');
  }
  
  return {
    ...newSession,
    cart: [],
    message_context: {},
  } as WhatsAppSession;
}

/**
 * Update session state
 */
export async function updateSessionState(
  sessionId: string,
  state: ConversationState,
  additionalUpdates?: Partial<WhatsAppSession>
): Promise<void> {
  const supabase = createServiceClient();
  
  const updates: any = {
    state,
    last_activity: new Date().toISOString(),
    ...additionalUpdates,
  };
  
  const { error } = await supabase
    .from('whatsapp_sessions')
    .update(updates)
    .eq('id', sessionId);
  
  if (error) {
    console.error('Error updating session state:', error);
    throw new Error('Failed to update session');
  }
}

/**
 * Update session cart
 */
export async function updateSessionCart(
  sessionId: string,
  cart: CartItem[]
): Promise<void> {
  const supabase = createServiceClient();
  
  const { error } = await supabase
    .from('whatsapp_sessions')
    .update({
      cart,
      last_activity: new Date().toISOString(),
    })
    .eq('id', sessionId);
  
  if (error) {
    console.error('Error updating session cart:', error);
    throw new Error('Failed to update cart');
  }
}

/**
 * Update session context (temporary data during conversation)
 */
export async function updateSessionContext(
  sessionId: string,
  context: MessageContext
): Promise<void> {
  const supabase = createServiceClient();
  
  const { error } = await supabase
    .from('whatsapp_sessions')
    .update({
      message_context: context,
      last_activity: new Date().toISOString(),
    })
    .eq('id', sessionId);
  
  if (error) {
    console.error('Error updating session context:', error);
    throw new Error('Failed to update context');
  }
}

/**
 * Update multiple session fields at once
 */
export async function updateSession(
  sessionId: string,
  updates: Partial<WhatsAppSession>
): Promise<void> {
  const supabase = createServiceClient();
  
  const { error } = await supabase
    .from('whatsapp_sessions')
    .update({
      ...updates,
      last_activity: new Date().toISOString(),
    })
    .eq('id', sessionId);
  
  if (error) {
    console.error('Error updating session:', error);
    throw new Error('Failed to update session');
  }
}

/**
 * Clear session cart and reset to menu browsing
 */
export async function clearSessionCart(sessionId: string): Promise<void> {
  const supabase = createServiceClient();
  
  const { error } = await supabase
    .from('whatsapp_sessions')
    .update({
      cart: [],
      state: 'BROWSING_MENU',
      message_context: {},
      selected_item_id: null,
      selected_category_id: null,
      pending_variation_selection: null,
      last_activity: new Date().toISOString(),
    })
    .eq('id', sessionId);
  
  if (error) {
    console.error('Error clearing session cart:', error);
    throw new Error('Failed to clear cart');
  }
}

/**
 * Reset session to initial state
 */
export async function resetSession(sessionId: string): Promise<void> {
  const supabase = createServiceClient();
  
  const { error } = await supabase
    .from('whatsapp_sessions')
    .update({
      state: 'IDLE',
      cart: [],
      message_context: {},
      selected_item_id: null,
      selected_category_id: null,
      pending_variation_selection: null,
      delivery_address: null,
      delivery_region_id: null,
      customer_latitude: null,
      customer_longitude: null,
      pending_order_id: null,
      last_activity: new Date().toISOString(),
    })
    .eq('id', sessionId);
  
  if (error) {
    console.error('Error resetting session:', error);
    throw new Error('Failed to reset session');
  }
}

/**
 * Set pending order ID when order is created
 */
export async function setPendingOrder(
  sessionId: string,
  orderId: string
): Promise<void> {
  const supabase = createServiceClient();
  
  const { error } = await supabase
    .from('whatsapp_sessions')
    .update({
      pending_order_id: orderId,
      state: 'PAYMENT_PENDING',
      last_activity: new Date().toISOString(),
    })
    .eq('id', sessionId);
  
  if (error) {
    console.error('Error setting pending order:', error);
    throw new Error('Failed to set pending order');
  }
}

/**
 * Mark session as order complete and clear cart
 */
export async function completeOrder(sessionId: string): Promise<void> {
  const supabase = createServiceClient();
  
  const { error } = await supabase
    .from('whatsapp_sessions')
    .update({
      state: 'ORDER_COMPLETE',
      cart: [],
      message_context: {},
      selected_item_id: null,
      selected_category_id: null,
      pending_variation_selection: null,
      pending_order_id: null,
      last_activity: new Date().toISOString(),
    })
    .eq('id', sessionId);
  
  if (error) {
    console.error('Error completing order:', error);
    throw new Error('Failed to complete order');
  }
}

/**
 * Check if customer is returning and get their last order details
 */
export async function getReturningCustomerData(
  phone: string
): Promise<ReturningCustomerData | null> {
  const supabase = createServiceClient();
  
  // Get last successful order from this phone number
  const { data: lastOrder } = await supabase
    .from('orders')
    .select('customer_name, customer_phone, delivery_address, delivery_region_id, delivery_region_name, customer_latitude, customer_longitude')
    .eq('customer_phone', phone)
    .eq('payment_status', 'success')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (!lastOrder) {
    return null;
  }
  
  // Get total order count
  const { count } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('customer_phone', phone)
    .eq('payment_status', 'success');
  
  return {
    name: lastOrder.customer_name,
    phone: lastOrder.customer_phone,
    last_address: lastOrder.delivery_address,
    last_region_id: lastOrder.delivery_region_id,
    last_region_name: lastOrder.delivery_region_name,
    last_latitude: lastOrder.customer_latitude,
    last_longitude: lastOrder.customer_longitude,
    total_orders: count || 0,
  };
}

/**
 * Log a WhatsApp message for debugging/analytics
 */
export async function logMessage(
  sessionId: string | null,
  phone: string,
  direction: 'inbound' | 'outbound',
  messageBody: string,
  options?: {
    messageType?: string;
    mediaUrl?: string;
    locationLatitude?: number;
    locationLongitude?: number;
    ultramsgId?: string;
    stateBefore?: string;
    stateAfter?: string;
  }
): Promise<void> {
  const supabase = createServiceClient();
  
  await supabase.from('whatsapp_message_log').insert({
    session_id: sessionId,
    phone,
    direction,
    message_type: options?.messageType || 'text',
    message_body: messageBody,
    media_url: options?.mediaUrl,
    location_latitude: options?.locationLatitude,
    location_longitude: options?.locationLongitude,
    ultramsg_id: options?.ultramsgId,
    state_before: options?.stateBefore,
    state_after: options?.stateAfter,
  });
}

/**
 * Get session by pending order ID (for payment webhook)
 */
export async function getSessionByPendingOrder(
  orderId: string
): Promise<WhatsAppSession | null> {
  const supabase = createServiceClient();
  
  const { data } = await supabase
    .from('whatsapp_sessions')
    .select('*')
    .eq('pending_order_id', orderId)
    .single();
  
  if (!data) return null;
  
  return {
    ...data,
    cart: data.cart || [],
    message_context: data.message_context || {},
  } as WhatsAppSession;
}

/**
 * Get last order items for reorder feature
 */
export async function getLastOrderItems(
  phone: string
): Promise<LastOrderData | null> {
  const supabase = createServiceClient();
  
  // Get last successful order with items
  const { data: lastOrder } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      customer_name,
      delivery_address,
      delivery_region_id,
      delivery_region_name,
      customer_latitude,
      customer_longitude,
      total,
      created_at,
      order_items (
        id,
        menu_item_id,
        item_name,
        quantity,
        unit_price,
        variation_name,
        variation_option,
        addons
      )
    `)
    .eq('customer_phone', phone)
    .eq('payment_status', 'success')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (!lastOrder || !lastOrder.order_items?.length) {
    return null;
  }
  
  return {
    order_number: lastOrder.order_number,
    customer_name: lastOrder.customer_name,
    delivery_address: lastOrder.delivery_address,
    delivery_region_id: lastOrder.delivery_region_id,
    delivery_region_name: lastOrder.delivery_region_name,
    customer_latitude: lastOrder.customer_latitude,
    customer_longitude: lastOrder.customer_longitude,
    total: lastOrder.total,
    created_at: lastOrder.created_at,
    items: lastOrder.order_items.map((item: {
      menu_item_id: string;
      item_name: string;
      quantity: number;
      unit_price: number;
      variation_name?: string;
      variation_option?: string;
      addons?: { name: string; price: number; quantity: number }[];
    }) => ({
      item_id: item.menu_item_id,
      item_name: item.item_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      variation_name: item.variation_name,
      variation_option: item.variation_option,
      addons: item.addons || [],
    })),
  };
}

export interface LastOrderData {
  order_number: string;
  customer_name: string;
  delivery_address: string;
  delivery_region_id: string | null;
  delivery_region_name: string | null;
  customer_latitude: number | null;
  customer_longitude: number | null;
  total: number;
  created_at: string;
  items: {
    item_id: string;
    item_name: string;
    quantity: number;
    unit_price: number;
    variation_name?: string;
    variation_option?: string;
    addons: { name: string; price: number; quantity: number }[];
  }[];
}
