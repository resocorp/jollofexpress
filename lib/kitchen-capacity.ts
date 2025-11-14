// Kitchen capacity management utilities
import { createServiceClient } from '@/lib/supabase/service';

// Default threshold for maximum active orders before auto-closing
export const DEFAULT_MAX_ACTIVE_ORDERS = 10;

// Order statuses that count as "active" in the kitchen
const ACTIVE_ORDER_STATUSES = ['confirmed', 'preparing', 'ready'];

/**
 * Count active orders currently in the kitchen
 */
export async function countActiveOrders(): Promise<number> {
  const supabase = createServiceClient();

  const { count, error } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .in('status', ACTIVE_ORDER_STATUSES);

  if (error) {
    console.error('Error counting active orders:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Get order settings including auto-close and max orders
 */
async function getOrderSettings(): Promise<{
  auto_close_when_busy: boolean;
  max_active_orders: number;
  is_open: boolean;
}> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'order_settings')
    .single();

  if (error || !data) {
    console.error('Error fetching order settings:', error);
    return {
      auto_close_when_busy: false,
      max_active_orders: DEFAULT_MAX_ACTIVE_ORDERS,
      is_open: false,
    };
  }

  const settings = data.value as {
    auto_close_when_busy?: boolean;
    max_active_orders?: number;
    is_open?: boolean;
  };

  return {
    auto_close_when_busy: settings.auto_close_when_busy ?? false,
    max_active_orders: settings.max_active_orders ?? DEFAULT_MAX_ACTIVE_ORDERS,
    is_open: settings.is_open ?? false,
  };
}

/**
 * Check if auto-close is enabled in settings
 */
export async function isAutoCloseEnabled(): Promise<boolean> {
  const settings = await getOrderSettings();
  return settings.auto_close_when_busy;
}

/**
 * Check if restaurant is currently accepting orders
 */
export async function isRestaurantOpen(): Promise<boolean> {
  const settings = await getOrderSettings();
  return settings.is_open;
}

/**
 * Update restaurant open/closed status
 */
export async function updateRestaurantStatus(
  isOpen: boolean,
  reason: string = ''
): Promise<boolean> {
  const supabase = createServiceClient();

  // Get current settings
  const { data: currentData, error: fetchError } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'order_settings')
    .single();

  if (fetchError || !currentData) {
    console.error('Error fetching current settings:', fetchError);
    return false;
  }

  const currentSettings = currentData.value as Record<string, any>;

  // Update is_open status
  const updatedSettings = {
    ...currentSettings,
    is_open: isOpen,
  };

  const { error: updateError } = await supabase
    .from('settings')
    .update({ value: updatedSettings })
    .eq('key', 'order_settings');

  if (updateError) {
    console.error('Error updating restaurant status:', updateError);
    return false;
  }

  console.log(
    `🏪 Restaurant ${isOpen ? 'OPENED' : 'CLOSED'}${reason ? `: ${reason}` : ''}`
  );

  return true;
}

/**
 * Check kitchen capacity and auto-close if needed
 * Returns true if restaurant was closed due to capacity
 */
export async function checkAndManageCapacity(): Promise<{
  action: 'none' | 'closed' | 'opened';
  activeOrders: number;
  threshold: number;
}> {
  // Get settings
  const settings = await getOrderSettings();
  const maxActiveOrders = settings.max_active_orders;

  // Check if auto-close is enabled
  if (!settings.auto_close_when_busy) {
    return {
      action: 'none',
      activeOrders: 0,
      threshold: maxActiveOrders,
    };
  }

  // Count active orders
  const activeOrders = await countActiveOrders();
  const isOpen = settings.is_open;

  console.log(`📊 Kitchen Status: ${activeOrders}/${maxActiveOrders} active orders, Restaurant: ${isOpen ? 'OPEN' : 'CLOSED'}`);

  // Auto-close if capacity exceeded
  if (activeOrders >= maxActiveOrders && isOpen) {
    const success = await updateRestaurantStatus(
      false,
      `Kitchen at capacity (${activeOrders} active orders)`
    );

    if (success) {
      // Send admin alert
      try {
        const { sendKitchenCapacityAlert } = await import('@/lib/notifications/notification-service');
        await sendKitchenCapacityAlert('closed', activeOrders, maxActiveOrders);
      } catch (error) {
        console.error('Failed to send kitchen closed alert:', error);
      }

      return {
        action: 'closed',
        activeOrders,
        threshold: maxActiveOrders,
      };
    }
  }

  // Auto-reopen if capacity available (with buffer of 2 orders)
  const reopenThreshold = Math.max(maxActiveOrders - 2, 1);
  if (activeOrders < reopenThreshold && !isOpen) {
    const success = await updateRestaurantStatus(
      true,
      `Kitchen capacity available (${activeOrders} active orders)`
    );

    if (success) {
      // Send admin alert
      try {
        const { sendKitchenCapacityAlert } = await import('@/lib/notifications/notification-service');
        await sendKitchenCapacityAlert('reopened', activeOrders, maxActiveOrders);
      } catch (error) {
        console.error('Failed to send kitchen reopened alert:', error);
      }

      return {
        action: 'opened',
        activeOrders,
        threshold: maxActiveOrders,
      };
    }
  }

  return {
    action: 'none',
    activeOrders,
    threshold: maxActiveOrders,
  };
}

/**
 * Get detailed kitchen capacity status
 */
export async function getCapacityStatus(): Promise<{
  isOpen: boolean;
  autoCloseEnabled: boolean;
  activeOrders: number;
  maxOrders: number;
  capacityPercentage: number;
  canAcceptOrders: boolean;
}> {
  const settings = await getOrderSettings();
  const activeOrders = await countActiveOrders();
  const maxOrders = settings.max_active_orders;

  return {
    isOpen: settings.is_open,
    autoCloseEnabled: settings.auto_close_when_busy,
    activeOrders,
    maxOrders,
    capacityPercentage: Math.round((activeOrders / maxOrders) * 100),
    canAcceptOrders: settings.is_open && activeOrders < maxOrders,
  };
}
