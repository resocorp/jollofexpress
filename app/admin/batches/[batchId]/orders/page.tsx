'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Printer, Loader2, RefreshCw, Package } from 'lucide-react';
import { adminFetch } from '@/lib/api-client';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';

interface BatchOrderItem {
  item_name: string;
  item_description?: string;
  quantity: number;
  selected_variation: { option: string } | null;
  selected_addons: { name: string; price: number }[];
  special_instructions: string | null;
  subtotal: number;
}

interface BatchOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string | null;
  delivery_city: string | null;
  delivery_instructions: string | null;
  order_type: string;
  status: string;
  total: number;
  payment_status: string;
  payment_method_type: string;
  created_at: string;
  order_items: BatchOrderItem[];
}

interface BatchInfo {
  id: string;
  delivery_date: string;
  status: string;
  total_orders: number;
  max_capacity: number;
  delivery_window?: {
    name: string;
    delivery_start: string;
    delivery_end: string;
  };
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  accepting:  { bg: 'bg-green-500/20',  text: 'text-green-400'  },
  cutoff:     { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  preparing:  { bg: 'bg-blue-500/20',   text: 'text-blue-400'   },
  dispatching:{ bg: 'bg-indigo-500/20', text: 'text-indigo-400' },
  completed:  { bg: 'bg-gray-500/20',   text: 'text-muted-foreground'   },
  cancelled:  { bg: 'bg-red-500/20',    text: 'text-red-400'    },
};

const ORDER_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  confirmed:        { bg: 'bg-blue-500/20',   text: 'text-blue-400'   },
  preparing:        { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  ready:            { bg: 'bg-teal-500/20',   text: 'text-teal-400'   },
  out_for_delivery: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  completed:        { bg: 'bg-green-500/20',  text: 'text-green-400'  },
};

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
}

export default function BatchOrdersPage() {
  const params = useParams<{ batchId: string }>();
  const router = useRouter();
  const batchId = params.batchId;
  const [isPrinting, setIsPrinting] = useState(false);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['batch-orders', batchId],
    queryFn: async () => {
      const res = await adminFetch(`/api/admin/batch/${batchId}/orders`);
      if (!res.ok) throw new Error('Failed to load batch orders');
      return res.json() as Promise<{ batch: BatchInfo; orders: BatchOrder[] }>;
    },
  });

  const handlePrintManifest = useCallback(async () => {
    setIsPrinting(true);
    try {
      const res = await adminFetch(`/api/admin/batch/${batchId}/print-manifest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Print failed');
      }
      toast.success('Manifest sent to printer');
    } catch (err: any) {
      toast.error(err.message || 'Failed to print manifest');
    } finally {
      setIsPrinting(false);
    }
  }, [batchId]);

  const batch = data?.batch;
  const orders = data?.orders || [];
  const sc = STATUS_COLORS[batch?.status || ''] || STATUS_COLORS.accepting;
  const deliveryWindow = batch?.delivery_window
    ? `${formatTime(batch.delivery_window.delivery_start)} – ${formatTime(batch.delivery_window.delivery_end)}`
    : '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/admin/batches')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Batches
          </Button>
          {batch && (
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-foreground">
                  {batch.delivery_window?.name || 'Batch'}
                </h1>
                <Badge className={`${sc.bg} ${sc.text} border-0 text-xs capitalize`}>
                  {batch.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {batch.delivery_date} · {deliveryWindow} · {orders.length} orders
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-muted-foreground border-border hover:bg-muted hover:text-foreground bg-transparent"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            onClick={handlePrintManifest}
            disabled={isPrinting || orders.length === 0}
            size="sm"
            className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white"
          >
            {isPrinting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Printer className="h-4 w-4 mr-2" />
            )}
            Print Manifest
          </Button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-center py-16 text-red-400">
          Failed to load batch orders. <button onClick={() => refetch()} className="underline">Retry</button>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && orders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Package className="h-12 w-12 mb-3 opacity-30" />
          <p>No orders in this batch yet.</p>
        </div>
      )}

      {/* Orders list */}
      {orders.length > 0 && (
        <div className="space-y-3">
          {orders.map((order) => {
            const osc = ORDER_STATUS_COLORS[order.status] || ORDER_STATUS_COLORS.confirmed;
            const isCod = order.payment_method_type === 'cod';
            return (
              <Card key={order.id} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-foreground">{order.order_number}</span>
                        <Badge className={`${osc.bg} ${osc.text} border-0 text-xs capitalize`}>
                          {order.status.replace('_', ' ')}
                        </Badge>
                        {isCod && (
                          <Badge className="bg-amber-500/20 text-amber-400 border-0 text-xs">COD</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{order.customer_name} · {order.customer_phone}</p>
                      {order.order_type === 'delivery' && order.delivery_address && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {order.delivery_city && `${order.delivery_city}, `}{order.delivery_address}
                          {order.delivery_instructions && ` · LM: ${order.delivery_instructions}`}
                        </p>
                      )}
                    </div>
                    <span className="text-base font-semibold text-foreground">{formatCurrency(order.total)}</span>
                  </div>

                  {/* Items */}
                  <div className="space-y-1.5">
                    {order.order_items.map((item, i) => (
                      <div key={i} className="text-sm">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-foreground font-medium">
                            {item.quantity}× {item.item_name}
                          </span>
                          {item.selected_variation && (
                            <span className="text-xs text-muted-foreground">({item.selected_variation.option})</span>
                          )}
                          <span className="text-xs text-muted-foreground ml-auto">{formatCurrency(item.subtotal)}</span>
                        </div>
                        {item.item_description && (
                          <p className="text-xs text-muted-foreground italic ml-4">{item.item_description}</p>
                        )}
                        {item.selected_addons && item.selected_addons.length > 0 && (
                          <p className="text-xs text-muted-foreground ml-4">
                            + {item.selected_addons.map(a => a.name).join(', ')}
                          </p>
                        )}
                        {item.special_instructions && (
                          <p className="text-xs text-amber-400 ml-4">Note: {item.special_instructions}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
