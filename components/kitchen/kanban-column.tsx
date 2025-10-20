'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OrderCard } from './order-card';
import type { OrderWithItems, OrderStatus } from '@/types/database';

interface KanbanColumnProps {
  status: OrderStatus;
  title: string;
  color: string;
  orders: OrderWithItems[];
  hasNewOrders?: boolean;
}

export function KanbanColumn({ status, title, color, orders, hasNewOrders }: KanbanColumnProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Column Header */}
      <div className={`${color} rounded-t-lg p-4 ${hasNewOrders ? 'animate-pulse' : ''}`}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg text-white">{title}</h2>
          <Badge variant="secondary" className="bg-white/20 text-white border-0">
            {orders.length}
          </Badge>
        </div>
      </div>

      {/* Column Content */}
      <div className="flex-1 bg-gray-800 rounded-b-lg p-4 min-h-[500px] max-h-[calc(100vh-250px)] overflow-y-auto">
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No orders</p>
            </div>
          ) : (
            orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
