'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Loader2, ChevronRight, ChevronLeft } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/formatters';
import { adminFetch } from '@/lib/api-client';
import { useOrderWindow } from '@/hooks/use-order-window';
import { toast } from 'sonner';
import Link from 'next/link';

interface DashboardStats {
  totalRevenue: { value: number; change: number };
  totalOrders: { value: number; change: number };
  avgOrderValue: { value: number; change: number };
  avgPrepTime: { value: number; change: number };
}

interface RecentOrder {
  id: string;
  order_number: string;
  customer_name: string;
  total: number;
  status: string;
  payment_status: string;
  created_at: string;
}

interface DashboardData {
  stats: DashboardStats;
  recentOrders: RecentOrder[];
}

interface BatchInfo {
  batch_id: string;
  delivery_date: string;
  delivery_window: string;
  window_name: string;
  status: string;
  orders_placed: number;
  max_capacity: number;
  capacity_percent: number;
}

const BATCH_STATES = ['accepting', 'cutoff', 'preparing', 'dispatching', 'completed'];
const BATCH_STATE_COLORS: Record<string, string> = {
  accepting: '#10B981',
  cutoff: '#F59E0B',
  preparing: '#3B82F6',
  dispatching: '#6366F1',
  completed: '#6B7280',
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  confirmed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  preparing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  ready: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  out_for_delivery: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
  success: 'bg-green-500/20 text-green-400 border-green-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export default function AdminDashboard() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardData> => {
      const response = await adminFetch('/api/admin/dashboard');
      if (!response.ok) throw new Error('Failed to fetch dashboard data');
      return response.json();
    },
    refetchInterval: 30000,
  });

  const { data: batchData } = useQuery({
    queryKey: ['today-batches-dashboard'],
    queryFn: async (): Promise<{ batches: BatchInfo[] }> => {
      const res = await fetch('/api/batch/current');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    refetchInterval: 15000,
  });

  const { countdownFormatted, secondsUntilCutoff } = useOrderWindow();

  const advanceMutation = useMutation({
    mutationFn: async (batchId: string) => {
      const res = await adminFetch(`/api/admin/batch/${batchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'advance' }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['today-batches-dashboard'] });
      toast.success('Batch advanced');
    },
  });

  const revertMutation = useMutation({
    mutationFn: async (batchId: string) => {
      const res = await adminFetch(`/api/admin/batch/${batchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revert' }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['today-batches-dashboard'] });
      toast.success('Batch reverted');
    },
  });

  const todayBatches = batchData?.batches || [];
  const activeBatch = todayBatches.find(b => b.status === 'accepting') || todayBatches[0];
  const totalOrders = todayBatches.reduce((sum, b) => sum + b.orders_placed, 0);
  const totalCapacity = todayBatches.reduce((sum, b) => sum + b.max_capacity, 0);
  const totalRevenue = data?.stats?.totalRevenue?.value || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Batch Status Hero */}
      {activeBatch && (
        <div className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    background: BATCH_STATE_COLORS[activeBatch.status] || '#6B7280',
                    boxShadow: `0 0 12px ${BATCH_STATE_COLORS[activeBatch.status] || '#6B7280'}88`,
                  }}
                />
                <span className="text-lg font-bold text-foreground uppercase tracking-wide">
                  {activeBatch.status}
                </span>
                <span className="text-sm text-muted-foreground">— {activeBatch.window_name}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {activeBatch.status === 'accepting' && secondsUntilCutoff > 0
                  ? `Receiving orders — cutoff in ${countdownFormatted}`
                  : activeBatch.status === 'cutoff' ? 'Orders closed — kitchen preparing'
                  : activeBatch.status === 'preparing' ? 'Shawarma is on the grill 🔥'
                  : activeBatch.status === 'dispatching' ? 'Riders are out delivering'
                  : activeBatch.status === 'completed' ? "Today's batch is complete"
                  : activeBatch.delivery_window
                }
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => revertMutation.mutate(activeBatch.batch_id)}
                disabled={activeBatch.status === 'accepting' || revertMutation.isPending}
                size="sm"
                variant="outline"
                className="text-muted-foreground border-border hover:bg-muted hover:text-foreground bg-transparent text-xs disabled:opacity-30"
              >
                <ChevronLeft className="h-3 w-3 mr-1" /> Revert
              </Button>
              <Button
                onClick={() => advanceMutation.mutate(activeBatch.batch_id)}
                disabled={activeBatch.status === 'completed' || advanceMutation.isPending}
                size="sm"
                className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white text-xs disabled:opacity-40"
              >
                {activeBatch.status === 'completed' ? 'Complete' : (
                  <>Advance <ChevronRight className="h-3 w-3 ml-1" /></>
                )}
              </Button>
            </div>
          </div>
          {/* Progress steps */}
          <div className="flex gap-1">
            {BATCH_STATES.map((s, i) => (
              <div
                key={s}
                className="flex-1 h-1.5 rounded-full transition-colors"
                style={{
                  background: BATCH_STATES.indexOf(activeBatch.status) >= i
                    ? BATCH_STATE_COLORS[s]
                    : '#1F2233',
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Orders Today', value: String(totalOrders), sub: `/ ${totalCapacity} capacity`, color: '#3B82F6' },
          { label: 'Revenue', value: formatCurrency(totalRevenue), sub: totalOrders > 0 ? `avg ${formatCurrency(totalRevenue / totalOrders)}` : '—', color: '#10B981' },
          { label: 'Batches', value: String(todayBatches.length), sub: `${todayBatches.filter(b => b.status === 'completed').length} completed`, color: '#6366F1' },
          { label: 'Cutoff In', value: secondsUntilCutoff > 0 ? countdownFormatted : '—', sub: 'next cutoff', color: '#F59E0B' },
        ].map((card, i) => (
          <div key={i} className="bg-card rounded-xl p-5 border border-border">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">{card.label}</div>
            <div className="text-2xl font-extrabold tabular-nums" style={{ color: card.color }}>{card.value}</div>
            <div className="text-[11px] text-muted-foreground mt-1">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Capacity + Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Capacity Ring */}
        <div className="bg-card rounded-xl p-6 border border-border flex flex-col items-center">
          <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-4">Batch Capacity</div>
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="#1F2233" strokeWidth="10" />
            <circle
              cx="60" cy="60" r="50" fill="none" stroke="#DC2626" strokeWidth="10"
              strokeDasharray={`${totalCapacity > 0 ? (totalOrders / totalCapacity) * 314 : 0} 314`}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
              style={{ transition: 'stroke-dasharray 0.5s' }}
            />
            <text x="60" y="56" textAnchor="middle" fill="#fff" fontSize="24" fontWeight="800">{totalOrders}</text>
            <text x="60" y="74" textAnchor="middle" fill="#6B7280" fontSize="11">of {totalCapacity}</text>
          </svg>
          <div className="mt-3 text-xs text-muted-foreground">
            {totalOrders >= totalCapacity * 0.8 ? '⚠ Nearing capacity' : `${totalCapacity - totalOrders} slots remaining`}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Recent Orders</h3>
            <Link href="/admin/orders" className="text-xs text-muted-foreground hover:text-foreground">View all →</Link>
          </div>
          <div className="divide-y divide-border/50">
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mx-auto" />
              </div>
            ) : !data?.recentOrders || data.recentOrders.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">No orders yet</p>
              </div>
            ) : (
              data.recentOrders.slice(0, 6).map((order) => (
                <div key={order.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{order.order_number}</span>
                      <Badge className={`text-[10px] border ${STATUS_BADGE_CLASSES[order.status] || 'bg-gray-500/20 text-gray-400'}`}>
                        {order.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{order.customer_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-400">{formatCurrency(order.total)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: 'Batch Management', desc: 'Configure delivery windows and manage batches', href: '/admin/batches' },
          { title: 'Order Management', desc: 'View and manage all orders', href: '/admin/orders' },
          { title: 'Settings', desc: 'Configure hours, fees, notifications', href: '/admin/settings' },
        ].map((action) => (
          <Link key={action.href} href={action.href}>
            <div className="bg-card rounded-xl p-5 border border-border hover:border-border transition-colors cursor-pointer">
              <h3 className="text-sm font-semibold text-foreground mb-1">{action.title}</h3>
              <p className="text-xs text-muted-foreground">{action.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
