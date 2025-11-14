// Cart state management with Zustand
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, MenuItem, ItemAddon, ItemVariationOption } from '@/types/database';

interface CartStore {
  items: CartItem[];
  promoCode: string | null;
  discount: number;
  pendingOrderId: string | null; // Track order ID for cart recovery
  
  // Actions
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

      addItem: (item, quantity, selectedVariation, selectedAddons = []) => {
        // Calculate item subtotal
        let itemPrice = item.base_price;
        
        // Add variation price adjustment (multiplied by variation quantity)
        if (selectedVariation) {
          const varQty = selectedVariation.quantity || 1;
          itemPrice += selectedVariation.option.price_adjustment * varQty;
        }
        
        // Add addons prices (each with their own quantity)
        const addonsTotal = selectedAddons.reduce((sum, addon) => sum + (addon.price * addon.quantity), 0);
        itemPrice += addonsTotal;
        
        const subtotal = itemPrice * quantity;

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
          const item = newItems[index];
          
          // Recalculate subtotal
          let itemPrice = item.item.base_price;
          
          if (item.selected_variation) {
            const varQty = item.selected_variation.quantity || 1;
            itemPrice += item.selected_variation.option.price_adjustment * varQty;
          }
          
          const addonsTotal = item.selected_addons.reduce((sum, addon) => sum + (addon.price * addon.quantity), 0);
          itemPrice += addonsTotal;
          
          newItems[index] = {
            ...item,
            quantity,
            subtotal: itemPrice * quantity,
          };

          return { items: newItems };
        });
      },

      clearCart: () => {
        set({ items: [], promoCode: null, discount: 0, pendingOrderId: null });
      },

      setPromoCode: (code, discount) => {
        set({ promoCode: code, discount });
      },

      setPendingOrder: (orderId) => {
        set({ pendingOrderId: orderId });
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
    }
  )
);
