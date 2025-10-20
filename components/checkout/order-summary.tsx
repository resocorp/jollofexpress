'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useCartStore } from '@/store/cart-store';
import { formatCurrency } from '@/lib/formatters';

export function OrderSummary() {
  const { items, discount, getSubtotal } = useCartStore();
  
  const subtotal = getSubtotal();
  const taxRate = 7.5; // This should come from settings
  const deliveryFee = 200; // This should come from settings
  const tax = Math.round((subtotal * taxRate) / 100);
  const total = subtotal + tax + deliveryFee - discount;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Order Items */}
        <div className="space-y-3">
          {items.map((cartItem, index) => (
            <div key={index} className="flex justify-between text-sm">
              <div className="flex-1">
                <p className="font-medium">
                  {cartItem.quantity}x {cartItem.item.name}
                </p>
                {cartItem.selected_variation && (
                  <p className="text-xs text-muted-foreground">
                    {cartItem.selected_variation.option.name}
                  </p>
                )}
                {cartItem.selected_addons.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    + {cartItem.selected_addons.map(a => a.name).join(', ')}
                  </p>
                )}
              </div>
              <span className="font-medium">{formatCurrency(cartItem.subtotal)}</span>
            </div>
          ))}
        </div>

        <Separator />

        {/* Price Breakdown */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Delivery Fee</span>
            <span>{formatCurrency(deliveryFee)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax (7.5%)</span>
            <span>{formatCurrency(tax)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Total */}
        <div className="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
