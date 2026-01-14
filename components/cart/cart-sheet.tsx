'use client';

import Link from 'next/link';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useCartStore } from '@/store/cart-store';
import { useDeliverySettings } from '@/hooks/use-settings';
import { formatCurrency } from '@/lib/formatters';

export function CartSheet() {
  const { items, removeItem, updateItemQuantity, clearCart, getSubtotal } = useCartStore();
  const { data: deliverySettings } = useDeliverySettings();

  const subtotal = getSubtotal();
  
  // Use standard delivery fee from admin settings
  const deliveryFee = deliverySettings?.delivery_fee || 0;
  // Tax is only calculated at checkout, not in cart
  const total = subtotal + deliveryFee;

  if (items.length === 0) {
    return (
      <>
        <SheetHeader>
          <SheetTitle>Your Cart</SheetTitle>
          <SheetDescription>Your cart is empty</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <ShoppingBag className="h-24 w-24 text-muted-foreground/30 mb-4" />
          <p className="text-lg font-medium text-muted-foreground mb-2">Your cart is empty</p>
          <p className="text-sm text-muted-foreground mb-6">Add some delicious items to get started</p>
          <Link href="/menu">
            <Button>Browse Menu</Button>
          </Link>
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <SheetHeader>
        <SheetTitle>Your Cart ({items.length} {items.length === 1 ? 'item' : 'items'})</SheetTitle>
        <SheetDescription>Review your order before checkout</SheetDescription>
      </SheetHeader>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto py-6 space-y-4">
        {items.map((cartItem, index) => (
          <div key={index} className="flex gap-4 p-4 border rounded-lg">
            <div className="flex-1">
              <h4 className="font-medium">{cartItem.item.name}</h4>
              
              {/* Variations */}
              {cartItem.selected_variation && (
                <p className="text-sm text-muted-foreground">
                  {cartItem.selected_variation.variation_name}: {cartItem.selected_variation.option.name}
                  {cartItem.selected_variation.quantity && cartItem.selected_variation.quantity > 1 && (
                    <span className="font-medium"> × {cartItem.selected_variation.quantity}</span>
                  )}
                </p>
              )}
              
              {/* Addons */}
              {cartItem.selected_addons.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Add-ons: {cartItem.selected_addons.map(a => `${a.name} × ${a.quantity}`).join(', ')}
                </p>
              )}

              {/* Quantity Controls */}
              <div className="flex items-center gap-2 mt-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateItemQuantity(index, cartItem.quantity - 1)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center font-medium">{cartItem.quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateItemQuantity(index, cartItem.quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col items-end justify-between">
              <p className="font-semibold">{formatCurrency(cartItem.subtotal)}</p>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => removeItem(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Separator className="my-4" />

      {/* Order Summary */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Delivery Fee</span>
          <span>{formatCurrency(deliveryFee)}</span>
        </div>
        <p className="text-xs text-muted-foreground italic">Tax calculated at checkout</p>
        <Separator />
        <div className="flex justify-between text-lg font-bold">
          <span>Estimated Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>

      {/* Checkout Button */}
      <div className="mt-6 space-y-2">
        <Link href="/checkout">
          <Button className="w-full" size="lg">
            Proceed to Checkout
          </Button>
        </Link>
        <Button variant="ghost" className="w-full" onClick={clearCart}>
          Clear Cart
        </Button>
      </div>
    </div>
  );
}
