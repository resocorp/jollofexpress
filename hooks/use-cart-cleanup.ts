// Hook to clean up stale cart after successful payment
import { useEffect, useRef } from 'react';
import { useCartStore } from '@/store/cart-store';
import { get } from '@/lib/api-client';
import type { Order } from '@/types/database';

/**
 * Hook to automatically clean up cart if the pending order has been paid
 * This prevents stale cart data from persisting after successful payments
 */
export function useCartCleanup() {
  const { pendingOrderId, clearCart } = useCartStore();
  const hasChecked = useRef(false);

  useEffect(() => {
    // Only check once per mount
    if (!pendingOrderId || hasChecked.current) {
      return;
    }

    hasChecked.current = true;

    const checkAndCleanup = async () => {
      try {
        // Fetch the pending order status
        const order = await get<Order>(`/api/orders/${pendingOrderId}`);
        
        // If payment was successful, clear the cart
        if (order.payment_status === 'success') {
          console.log(`[Cart Cleanup] Clearing stale cart for paid order ${pendingOrderId}`);
          clearCart();
        } else {
          console.log(`[Cart Cleanup] Preserving cart for unpaid order ${pendingOrderId} (status: ${order.payment_status})`);
        }
      } catch (error: any) {
        // Only clear cart if we're certain the order doesn't exist (404)
        // Don't clear on network errors, auth errors, etc.
        if (error.statusCode === 404) {
          console.log(`[Cart Cleanup] Order ${pendingOrderId} not found (404), clearing stale cart`);
          clearCart();
        } else {
          // Preserve cart on other errors (network issues, auth, etc.)
          console.warn(`[Cart Cleanup] Failed to check order ${pendingOrderId}, preserving cart:`, error.message);
        }
      }
    };

    checkAndCleanup();
  }, [pendingOrderId, clearCart]);
}
