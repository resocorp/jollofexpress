'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ConversationDetail } from '@/hooks/use-whatsapp-conversations';

interface Props {
  conversation: ConversationDetail;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-zinc-500/20 text-zinc-300',
  scheduled: 'bg-purple-500/20 text-purple-300',
  confirmed: 'bg-blue-500/20 text-blue-300',
  preparing: 'bg-yellow-500/20 text-yellow-300',
  ready: 'bg-cyan-500/20 text-cyan-300',
  out_for_delivery: 'bg-indigo-500/20 text-indigo-300',
  completed: 'bg-emerald-500/20 text-emerald-300',
  cancelled: 'bg-red-500/20 text-red-300',
};

function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString()}`;
}

export function CustomerContextPanel({ conversation }: Props) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p className="font-medium">{conversation.customer_name || 'Unknown'}</p>
          <p className="text-muted-foreground">{conversation.phone}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent orders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {conversation.recent_orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            conversation.recent_orders.map((order) => (
              <a
                key={order.id}
                href={`/admin/orders?orderId=${order.id}`}
                className="flex items-start justify-between p-2 rounded hover:bg-muted/50 text-sm"
              >
                <div>
                  <p className="font-medium">#{order.order_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString()} · {formatNaira(order.total_amount)}
                  </p>
                </div>
                <Badge className={STATUS_COLORS[order.status] || 'bg-zinc-500/20 text-zinc-300'}>
                  {order.status.replace(/_/g, ' ')}
                </Badge>
              </a>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
