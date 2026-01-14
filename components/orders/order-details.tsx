'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { MapPin, Phone, Mail, User, Home } from 'lucide-react';
import { formatCurrency, formatPhoneNumber, formatAddress } from '@/lib/formatters';
import type { OrderWithItems } from '@/types/database';

interface OrderDetailsProps {
  order: OrderWithItems;
}

export function OrderDetails({ order }: OrderDetailsProps) {
  return (
    <div className="space-y-6">
      {/* Customer Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Customer Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{order.customer_name}</span>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{formatPhoneNumber(order.customer_phone)}</span>
          </div>
          {order.customer_phone_alt && (
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{formatPhoneNumber(order.customer_phone_alt)} (Alt)</span>
            </div>
          )}
          {order.customer_email && (
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{order.customer_email}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivery Address */}
      {order.order_type === 'delivery' && order.delivery_address && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Delivery Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="font-medium">{order.delivery_city}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {formatAddress(
                  order.delivery_address,
                  order.address_type || undefined,
                  order.unit_number || undefined
                )}
              </p>
            </div>
            {order.delivery_instructions && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs font-medium text-blue-900 mb-1">Nearest Landmark:</p>
                <p className="text-sm text-blue-800">{order.delivery_instructions}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Order Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {order.items?.filter(item => item != null).map((item, index) => (
              <div key={index} className="flex justify-between gap-4">
                <div className="flex-1">
                  <p className="font-medium">
                    {item.quantity}x {item.item_name}
                  </p>
                  {item.selected_variation && (
                    <p className="text-sm text-muted-foreground">
                      {item.selected_variation.option}
                    </p>
                  )}
                  {item.selected_addons && item.selected_addons.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      + {item.selected_addons.map((a) => a.name).join(', ')}
                    </p>
                  )}
                </div>
                <span className="font-medium whitespace-nowrap">
                  {formatCurrency(item.subtotal)}
                </span>
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          {/* Price Breakdown */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            {order.delivery_fee > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery Fee</span>
                <span>{formatCurrency(order.delivery_fee)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>{formatCurrency(order.tax)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount {order.promo_code && `(${order.promo_code})`}</span>
                <span>-{formatCurrency(order.discount)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Support */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            Need help with your order?
          </p>
          <p className="text-sm font-medium text-center mt-1">
            Call us: +234 810 682 8147
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
