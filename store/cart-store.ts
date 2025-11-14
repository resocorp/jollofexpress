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
    selectedVariation?: { variation_name: string; option: ItemVariationOption },
    selectedAddons?: ItemAddon[],
    specialInstructions?: string
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

      addItem: (item, quantity, selectedVariation, selectedAddons = [], specialInstructions) => {
        // Calculate item subtotal
        let itemPrice = item.base_price;
        
        // Add variation price adjustment
        if (selectedVariation) {
          itemPrice += selectedVariation.option.price_adjustment;
        }
        
        // Add addons prices
        const addonsTotal = selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
        itemPrice += addonsTotal;
        
        const subtotal = itemPrice * quantity;

        const cartItem: CartItem = {
          item,
          quantity,
          selected_variation: selectedVariation,
          selected_addons: selectedAddons,
          special_instructions: specialInstructions,
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
            itemPrice += item.selected_variation.option.price_adjustment;
          }
          
          const addonsTotal = item.selected_addons.reduce((sum, addon) => sum + addon.price, 0);
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
