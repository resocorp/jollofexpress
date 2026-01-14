'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { KanbanColumn } from './kanban-column';
import type { OrderWithItems, OrderStatus } from '@/types/database';

interface KanbanBoardProps {
  orders: OrderWithItems[];
  isLoading: boolean;
}

const COLUMNS: { id: OrderStatus; title: string; color: string }[] = [
  { id: 'confirmed', title: 'New Orders', color: 'bg-blue-600' },
  { id: 'out_for_delivery', title: 'Out for Delivery', color: 'bg-purple-600' },
];

export function KanbanBoard({ orders, isLoading }: KanbanBoardProps) {
  const [hasNewOrder, setHasNewOrder] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousOrderCount = useRef(orders.length);

  // Play audio alert for new orders
  useEffect(() => {
    if (orders.length > previousOrderCount.current) {
      setHasNewOrder(true);
      
      // Play sound (browser will need user interaction first)
      if (audioRef.current) {
        audioRef.current.play().catch(() => {
          // Ignore if autoplay is blocked
        });
      }

      // Remove flash after 5 seconds
      setTimeout(() => setHasNewOrder(false), 5000);
    }
    previousOrderCount.current = orders.length;
  }, [orders.length]);

  // Group orders by status
  const ordersByStatus = COLUMNS.reduce((acc, column) => {
    acc[column.id] = orders.filter((order) => order.status === column.id);
    return acc;
  }, {} as Record<OrderStatus, OrderWithItems[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Audio alert for new orders */}
      <audio
        ref={audioRef}
        src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGnOH0u2sfCSeE"
      />

      {/* New Order Flash Overlay */}
      {hasNewOrder && (
        <div className="fixed inset-0 bg-blue-500/20 animate-pulse pointer-events-none z-50" />
      )}

      {/* Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            status={column.id}
            title={column.title}
            color={column.color}
            orders={ordersByStatus[column.id] || []}
            hasNewOrders={hasNewOrder && column.id === 'confirmed'}
          />
        ))}
      </div>

      {/* Empty State */}
      {orders.length === 0 && (
        <div className="text-center py-12">
          <p className="text-xl text-gray-400">No active orders</p>
          <p className="text-sm text-gray-500 mt-2">New orders will appear here automatically</p>
        </div>
      )}
    </div>
  );
}
