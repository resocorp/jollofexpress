'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  MapPin, 
  Phone, 
  Printer, 
  ChevronRight,
  User,
  Home,
  Loader2
} from 'lucide-react';
import { formatCurrency, formatKitchenTime, getOrderAgeMinutes, getOrderAgeColor, formatPhoneNumber } from '@/lib/formatters';
import { useUpdateOrderStatus, useReprintOrder } from '@/hooks/use-orders';
import { toast } from 'sonner';
import type { OrderWithItems, OrderStatus } from '@/types/database';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface OrderCardProps {
  order: OrderWithItems;
}

const STATUS_FLOW: Record<OrderStatus, OrderStatus | null> = {
  pending: 'confirmed',
  scheduled: 'confirmed',
  confirmed: 'out_for_delivery',
  preparing: 'out_for_delivery', // Legacy: skip to out_for_delivery
  ready: 'out_for_delivery', // Legacy: skip to out_for_delivery
  out_for_delivery: 'completed',
  completed: null,
  cancelled: null,
};

export function OrderCard({ order }: OrderCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isReprinting, setIsReprinting] = useState(false);
  const updateStatus = useUpdateOrderStatus();
  const reprintOrder = useReprintOrder();

  const ageInMinutes = getOrderAgeMinutes(order.created_at);
  const borderColor = getOrderAgeColor(order.created_at);
  const nextStatus = STATUS_FLOW[order.status];

  const handleAdvanceStatus = async () => {
    if (!nextStatus) return;

    setIsAdvancing(true);
    try {
      await updateStatus.mutateAsync({
        orderId: order.id,
        status: nextStatus,
      });
      toast.success(`Order moved to ${nextStatus}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update order');
    } finally {
      setIsAdvancing(false);
    }
  };

  const handleReprint = async () => {
    setIsReprinting(true);
    try {
      console.log('[REPRINT] Initiating reprint for order:', order.order_number, order.id);
      const result = await reprintOrder.mutateAsync(order.id);
      console.log('[REPRINT] Success:', result);
      toast.success('Reprint queued - check print handler');
    } catch (error: any) {
      console.error('[REPRINT] Error:', error);
      toast.error(error.message || 'Failed to reprint');
    } finally {
      setIsReprinting(false);
    }
  };

  return (
    <>
      <Card 
        className={`border-l-4 ${borderColor} bg-white cursor-pointer hover:shadow-lg transition-shadow`}
        onClick={() => setShowDetails(true)}
      >
        <CardContent className="p-4">
          {/* Order Header */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{order.order_number}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">{formatKitchenTime(order.created_at)}</span>
                <Badge variant={ageInMinutes > 20 ? 'destructive' : ageInMinutes > 10 ? 'secondary' : 'default'}>
                  {ageInMinutes} min
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-gray-900">{formatCurrency(order.total)}</p>
              <Badge variant="outline" className="mt-1">
                {order.order_type}
              </Badge>
            </div>
          </div>

          {/* Order Items (Summary) */}
          <div className="space-y-1 mb-3">
            {order.items?.slice(0, 3).map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="font-medium text-gray-700">
                  {item.quantity}x {item.item_name}
                </span>
              </div>
            ))}
            {order.items && order.items.length > 3 && (
              <p className="text-sm text-gray-500">
                +{order.items.length - 3} more items
              </p>
            )}
          </div>

          {/* Customer Info */}
          <div className="space-y-1 mb-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="h-4 w-4" />
              <span className="font-medium">{order.customer_name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="h-4 w-4" />
              <span>{formatPhoneNumber(order.customer_phone)}</span>
            </div>
            {order.order_type === 'delivery' && order.delivery_address && (
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-2">{order.delivery_address}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleReprint();
              }}
              disabled={isReprinting}
              className="flex-shrink-0"
            >
              {isReprinting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Printer className="h-4 w-4" />
              )}
            </Button>
            {nextStatus && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAdvanceStatus();
                }}
                disabled={isAdvancing}
                className="flex-1"
                size="sm"
              >
                {isAdvancing ? 'Moving...' : 
                  nextStatus === 'out_for_delivery' ? 'Out for Delivery' :
                  nextStatus === 'completed' ? 'Mark as Delivered' :
                  'Next Stage'
                }
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Full Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order {order.order_number}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Time & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Order Time</p>
                <p className="font-medium">{formatKitchenTime(order.created_at)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Age</p>
                <Badge variant={ageInMinutes > 20 ? 'destructive' : 'default'}>
                  {ageInMinutes} minutes
                </Badge>
              </div>
            </div>

            {/* Customer Details */}
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Customer Information</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{order.customer_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{formatPhoneNumber(order.customer_phone)}</span>
                </div>
                {order.customer_phone_alt && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{formatPhoneNumber(order.customer_phone_alt)} (Alt)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Delivery Address */}
            {order.order_type === 'delivery' && (
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Delivery Address
                </h3>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="font-medium">{order.delivery_city}</p>
                  <p className="text-sm mt-1">{order.delivery_address}</p>
                  {order.address_type && (
                    <Badge variant="outline" className="mt-2">
                      <Home className="h-3 w-3 mr-1" />
                      {order.address_type}
                    </Badge>
                  )}
                  {order.unit_number && (
                    <p className="text-sm mt-1">Unit: {order.unit_number}</p>
                  )}
                  {order.delivery_instructions && (
                    <div className="mt-3 p-2 bg-white rounded border">
                      <p className="text-xs font-semibold mb-1">Landmark:</p>
                      <p className="text-sm">{order.delivery_instructions}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Order Items */}
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Order Items</h3>
              <div className="space-y-3">
                {order.items?.filter(item => item != null).map((item, index) => (
                  <div key={index} className="border-b pb-3 last:border-0">
                    <div className="flex justify-between">
                      <span className="font-medium">{item.quantity}x {item.item_name}</span>
                      <span>{formatCurrency(item.subtotal)}</span>
                    </div>
                    {item.selected_variation && (
                      <p className="text-sm text-muted-foreground">
                        • {item.selected_variation.option}
                      </p>
                    )}
                    {item.selected_addons && item.selected_addons.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        • Add-ons: {item.selected_addons.map(a => a.name).join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="mt-4 pt-3 border-t">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={handleReprint} disabled={isReprinting} className="flex-1">
                {isReprinting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Printer className="h-4 w-4 mr-2" />
                )}
                {isReprinting ? 'Printing...' : 'Reprint'}
              </Button>
              {nextStatus && (
                <Button onClick={handleAdvanceStatus} disabled={isAdvancing} className="flex-1">
                  {isAdvancing ? 'Moving...' : 
                    nextStatus === 'completed' ? 'Mark as Delivered' :
                    `Move to ${nextStatus}`
                  }
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
