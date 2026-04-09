'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Receipt, Package, ChevronRight } from 'lucide-react';
import { formatCurrency, formatRelativeTime, formatOrderStatus, getStatusBadgeVariant } from '@/lib/formatters';
import Link from 'next/link';

interface OrderSummary {
  id: string;
  status: string;
  total: number;
  created_at: string;
  delivery_window: string | null;
  delivery_date: string | null;
  order_type: string;
  customer_name: string;
  payment_status: string;
}

export default function OrdersPage() {
  const [phone, setPhone] = useState('');
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOrders(null);

    const trimmed = phone.trim();
    if (!trimmed) return;

    // Basic client-side validation
    if (!/^(\+234|0)[789]\d{9}$/.test(trimmed)) {
      setError('Please enter a valid Nigerian phone number (e.g. 08012345678)');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/orders/lookup?phone=${encodeURIComponent(trimmed)}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to look up orders');
        return;
      }

      setOrders(data.orders);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-8 pb-24">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-6">
            <Receipt className="h-10 w-10 text-primary mx-auto mb-2" />
            <h1 className="text-2xl font-bold">Track Your Orders</h1>
            <p className="text-muted-foreground mt-1">
              Enter your phone number to find your recent orders
            </p>
          </div>

          <form onSubmit={handleLookup} className="flex gap-2 mb-6">
            <Input
              type="tel"
              placeholder="08012345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </form>

          {error && (
            <p className="text-sm text-destructive text-center mb-4">{error}</p>
          )}

          {orders !== null && orders.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No orders found for this number</p>
                <Link href="/menu">
                  <Button variant="outline" className="mt-4">Browse Menu</Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {orders && orders.length > 0 && (
            <div className="space-y-3">
              {orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}?phone=${encodeURIComponent(phone.trim())}`}
                >
                  <Card className="hover:shadow-md transition-shadow cursor-pointer mb-3">
                    <CardContent className="py-4 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={getStatusBadgeVariant(order.status)}>
                              {formatOrderStatus(order.status)}
                            </Badge>
                            <span className="text-xs text-muted-foreground capitalize">
                              {order.order_type}
                            </span>
                          </div>
                          <p className="font-semibold">{formatCurrency(order.total)}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatRelativeTime(order.created_at)}
                            {order.delivery_window && ` \u00b7 ${order.delivery_window}`}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
      <BottomNav />
    </div>
  );
}
