// Cart state management with Zustand
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, MenuItem, ItemAddon, ItemVariationOption, DeliveryRegion } from '@/types/database';

/**
 * Calculate the unit price for a cart item including variation and addon adjustments
 */
function calculateItemPrice(
  baseItem: MenuItem,
  selectedVariation?: { variation_name: string; option: ItemVariationOption; quantity?: number },
  selectedAddons: (ItemAddon & { quantity: number })[] = []
): number {
  let price = baseItem.promo_price ?? baseItem.base_price;

  if (selectedVariation) {
    const variationQuantity = selectedVariation.quantity || 1;
    price += selectedVariation.option.price_adjustment * variationQuantity;
  }

  const addonsTotal = selectedAddons.reduce(
    (sum, addon) => sum + addon.price * addon.quantity,
    0
  );
  price += addonsTotal;

  return price;
}

interface CartStore {
  items: CartItem[];
  promoCode: string | null;
  discount: number;
  pendingOrderId: string | null; // Track order ID for cart recovery
  selectedRegionId: string | null; // Selected delivery region ID
  _hasHydrated: boolean; // Track if store has been hydrated from localStorage
  
  // Actions
  setHasHydrated: (state: boolean) => void;
  addItem: (
    item: MenuItem,
    quantity: number,
    selectedVariation?: { variation_name: string; option: ItemVariationOption; quantity?: number },
    selectedAddons?: (ItemAddon & { quantity: number })[]
  ) => void;
  removeItem: (index: number) => void;
  updateItemQuantity: (index: number, quantity: number) => void;
  clearCart: () => void;
  setPromoCode: (code: string | null, discount: number) => void;
  setPendingOrder: (orderId: string | null) => void;
  setSelectedRegionId: (regionId: string | null) => void;
  
  // Computed values
  getSubtotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      promoCode: null,
      discount: 0,
      pendingOrderId: null,
      selectedRegionId: null,
      _hasHydrated: false,

      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },

      addItem: (item, quantity, selectedVariation, selectedAddons = []) => {
        if (item.is_available === false || item.is_listed === false) {
          if (typeof window !== 'undefined') {
            console.warn('Refusing to add unavailable item to cart:', item.name);
          }
          return;
        }

        const unitPrice = calculateItemPrice(item, selectedVariation, selectedAddons);
        const subtotal = unitPrice * quantity;

        const cartItem: CartItem = {
          item,
          quantity,
          selected_variation: selectedVariation,
          selected_addons: selectedAddons,
          subtotal,
        };

        set((state) => ({
          items: [...state.items, cartItem],
        }));
      },

      removeItem: (index) => {
        set((state) => ({
          items: state.items.filter((_, i) => i !== index),
        }));
      },

      updateItemQuantity: (index, quantity) => {
        if (quantity <= 0) {
          get().removeItem(index);
          return;
        }

        set((state) => {
          const newItems = [...state.items];
          const cartItem = newItems[index];
          const unitPrice = calculateItemPrice(
            cartItem.item,
            cartItem.selected_variation,
            cartItem.selected_addons
          );

          newItems[index] = {
            ...cartItem,
            quantity,
            subtotal: unitPrice * quantity,
          };

          return { items: newItems };
        });
      },

      clearCart: () => {
        set({ items: [], promoCode: null, discount: 0, pendingOrderId: null, selectedRegionId: null });
      },

      setPromoCode: (code, discount) => {
        set({ promoCode: code, discount });
      },

      setPendingOrder: (orderId) => {
        set({ pendingOrderId: orderId });
      },

      setSelectedRegionId: (regionId) => {
        set({ selectedRegionId: regionId });
      },

      getSubtotal: () => {
        return get().items.reduce((sum, item) => sum + item.subtotal, 0);
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: 'jollofexpress-cart',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
