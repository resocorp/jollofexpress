'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useCartStore } from '@/store/cart-store';
import { useDeliverySettings } from '@/hooks/use-settings';
import { formatCurrency } from '@/lib/formatters';
import { ShoppingCart, Tag, Bike, Receipt } from 'lucide-react';
import { motion } from 'framer-motion';

interface OrderSummaryProps {
  orderType?: 'delivery' | 'carryout';
}

export function OrderSummary({ orderType = 'delivery' }: OrderSummaryProps) {
  const { items, discount, getSubtotal } = useCartStore();
  const { data: deliverySettings } = useDeliverySettings();
  
  const subtotal = getSubtotal();
  const taxRate = 7.5; // This should come from settings
  const deliveryFee = orderType === 'delivery' ? (deliverySettings?.delivery_fee || 0) : 0;
  const tax = Math.round((subtotal * taxRate) / 100);
  const total = subtotal + tax + deliveryFee - discount;

  return (
    <Card className="border-2 shadow-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 via-orange-50 to-red-50 border-b">
        <CardTitle className="flex items-center gap-2 text-xl">
          <ShoppingCart className="h-5 w-5 text-primary" />
          Order Summary
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          {items.length} {items.length === 1 ? 'item' : 'items'} in your cart
        </p>
      </CardHeader>
      <CardContent className="space-y-5 p-6">
        {/* Order Items */}
        <div className="space-y-4">
          {items.map((cartItem, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex-shrink-0">
                {cartItem.quantity}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">
                  {cartItem.item.name}
                </p>
                {cartItem.selected_variation && (
                  <p className="text-xs text-muted-foreground mt-1">
                    • {cartItem.selected_variation.option.name}
                  </p>
                )}
                {cartItem.selected_addons.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    + {cartItem.selected_addons.map(a => a.name).join(', ')}
                  </p>
                )}
              </div>
              <span className="font-bold text-sm text-primary whitespace-nowrap">
                {formatCurrency(cartItem.subtotal)}
              </span>
            </motion.div>
          ))}
        </div>

        <Separator className="my-4" />

        {/* Price Breakdown */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Subtotal
            </span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>
          {orderType === 'delivery' && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-2">
                <Bike className="h-4 w-4" />
                Delivery Fee
              </span>
              <span className="font-medium">{formatCurrency(deliveryFee)}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Tax (7.5%)
            </span>
            <span className="font-medium">{formatCurrency(tax)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between items-center p-3 rounded-lg bg-green-50 border border-green-200">
              <span className="text-green-700 font-medium">Discount Applied</span>
              <span className="text-green-700 font-bold">-{formatCurrency(discount)}</span>
            </div>
          )}
        </div>

        <Separator className="my-4" />

        {/* Total */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-primary to-orange-600 text-white shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm opacity-90">Total Amount</p>
              <p className="text-3xl font-bold">{formatCurrency(total)}</p>
            </div>
            <div className="text-right">
              <Badge className="bg-white/20 backdrop-blur-sm border-white/30 text-white">
                {orderType === 'delivery' ? 'Delivery' : 'Carryout'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
          <p className="text-xs text-blue-900">
            <strong>💳 Payment:</strong> You'll be redirected to a secure payment page after submitting your order.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
