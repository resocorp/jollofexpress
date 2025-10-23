'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Clock, Loader2 } from 'lucide-react';
import { formatOrderStatus, formatDateTime, formatRelativeTime } from '@/lib/formatters';
import type { OrderWithItems } from '@/types/database';

interface OrderTrackerProps {
  order: OrderWithItems;
}

const ORDER_STAGES = [
  { key: 'confirmed', label: 'Payment Confirmed', icon: CheckCircle2 },
  { key: 'preparing', label: 'Preparing', icon: Clock },
  { key: 'ready', label: 'Ready for Pickup', icon: CheckCircle2 },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: CheckCircle2 },
  { key: 'completed', label: 'Delivered', icon: CheckCircle2 },
];

export function OrderTracker({ order }: OrderTrackerProps) {
  const currentStageIndex = ORDER_STAGES.findIndex((stage) => stage.key === order.status);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Order {order.order_number}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Placed {formatRelativeTime(order.created_at)}
            </p>
          </div>
          <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
            {formatOrderStatus(order.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Progress Tracker */}
        <div className="relative">
          {ORDER_STAGES.map((stage, index) => {
            const isCompleted = index <= currentStageIndex;
            const isCurrent = index === currentStageIndex;
            const StageIcon = stage.icon;

            return (
              <div key={stage.key} className="relative pb-8 last:pb-0">
                {/* Connecting Line */}
                {index < ORDER_STAGES.length - 1 && (
                  <div
                    className={`absolute left-5 top-10 w-0.5 h-full -ml-px ${
                      isCompleted ? 'bg-primary' : 'bg-gray-200'
                    }`}
                  />
                )}

                {/* Stage Item */}
                <div className="relative flex items-start group">
                  {/* Icon */}
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                      isCompleted
                        ? 'bg-primary border-primary text-white'
                        : 'bg-white border-gray-300 text-gray-400'
                    } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}
                  >
                    {isCurrent && order.status !== 'completed' ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : isCompleted ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="ml-4 flex-1">
                    <p
                      className={`font-medium ${
                        isCompleted ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {stage.label}
                    </p>
                    {isCurrent && order.estimated_prep_time && stage.key === 'preparing' && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Estimated time: {order.estimated_prep_time} minutes
                      </p>
                    )}
                    {isCurrent && (
                      <Badge variant="outline" className="mt-2">
                        Current Status
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Note about tracking */}
        {order.status === 'out_for_delivery' && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Your order is on its way!</strong> Our delivery rider will contact you if they need directions.
            </p>
            {order.customer_phone && (
              <p className="text-sm text-blue-800 mt-2">
                Contact number: {order.customer_phone}
              </p>
            )}
          </div>
        )}

        {/* Completed */}
        {order.status === 'completed' && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-900">
              <strong>Order completed!</strong> Thank you for choosing JollofExpress.
            </p>
            {order.completed_at && (
              <p className="text-sm text-green-800 mt-1">
                Completed at {formatDateTime(order.completed_at)}
              </p>
            )}
          </div>
        )}

        {/* Cancelled */}
        {order.status === 'cancelled' && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-900">
              <strong>Order cancelled.</strong> If you have any questions, please contact us.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
