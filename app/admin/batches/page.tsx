'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Clock, Package, ChevronRight, ChevronLeft, Pencil, X, Check, Map, List } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { adminFetch } from '@/lib/api-client';
import { toast } from 'sonner';

interface DeliveryWindow {
  id: string;
  name: string;
  order_open_time: string;
  cutoff_time: string;
  delivery_start: string;
  delivery_end: string;
  max_capacity: number;
  is_active: boolean;
  display_order: number;
  days_of_week: number[] | null;
}

interface Batch {
  id: string;
  batch_id: string;
  delivery_date: string;
  window_name: string;
  status: string;
  orders_placed: number;
  total_orders: number;
  delivery_stops: number;
  max_capacity: number;
  capacity_percent: number;
  delivery_window: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  accepting: { bg: 'bg-green-500/20', text: 'text-green-400' },
  cutoff: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  preparing: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  dispatching: { bg: 'bg-indigo-500/20', text: 'text-indigo-400' },
  completed: { bg: 'bg-gray-500/20', text: 'text-muted-foreground' },
  cancelled: { bg: 'bg-red-500/20', text: 'text-red-400' },
};

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

function formatDaysOfWeek(days: number[] | null | undefined): string {
  if (!days || days.length === 7) return 'Every day';
  if (days.length === 0) return 'No days';
  const sorted = [...days].sort();
  return sorted.map((d) => DAY_LABELS[d]).join(', ');
}

function DaysOfWeekPicker({
  value,
  onChange,
}: {
  value: number[] | null;
  onChange: (next: number[] | null) => void;
}) {
  // null = every day; treat as all selected for display
  const selected = value === null ? ALL_DAYS : value;
  const toggle = (day: number) => {
    const has = selected.includes(day);
    const next = has ? selected.filter((d) => d !== day) : [...selected, day].sort();
    // Normalize "all 7 selected" back to null (= every day) for cleaner DB state
    if (next.length === 7) onChange(null);
    else onChange(next);
  };
  return (
    <div>
      <Label className="text-xs text-muted-foreground">Active days</Label>
      <div className="flex flex-wrap gap-1.5 mt-1.5">
        {ALL_DAYS.map((d) => {
          const isSelected = selected.includes(d);
          return (
            <button
              key={d}
              type="button"
              onClick={() => toggle(d)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                isSelected
                  ? 'bg-orange-500/20 border-orange-500/50 text-orange-300'
                  : 'bg-background border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {DAY_LABELS[d]}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground mt-1">
        {value === null
          ? 'Every day (deselect a day to skip it, e.g. Sunday)'
          : selected.length === 0
          ? 'Pick at least one day'
          : `Active: ${formatDaysOfWeek(selected)}`}
      </p>
    </div>
  );
}

export default function BatchesPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [showNewWindow, setShowNewWindow] = useState(false);
  const [newWindow, setNewWindow] = useState<{
    name: string;
    order_open_time: string;
    cutoff_time: string;
    delivery_start: string;
    delivery_end: string;
    max_capacity: number;
    days_of_week: number[] | null;
  }>({
    name: '',
    order_open_time: '08:00',
    cutoff_time: '14:00',
    delivery_start: '16:00',
    delivery_end: '18:00',
    max_capacity: 50,
    days_of_week: null,
  });

  // Fetch delivery windows
  const { data: windowsData, isLoading: windowsLoading } = useQuery({
    queryKey: ['delivery-windows'],
    queryFn: async () => {
      const res = await adminFetch('/api/admin/delivery-windows');
      if (!res.ok) throw new Error('Failed');
      return res.json() as Promise<{ windows: DeliveryWindow[] }>;
    },
  });

  // Fetch today's batches
  const { data: batchesData, isLoading: batchesLoading } = useQuery({
    queryKey: ['today-batches'],
    queryFn: async () => {
      const res = await fetch('/api/batch/current');
      if (!res.ok) throw new Error('Failed');
      return res.json() as Promise<{ batches: Batch[] }>;
    },
    refetchInterval: 15000,
  });

  // Fetch recent batches (last 7 days)
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const { data: calendarData } = useQuery({
    queryKey: ['batch-calendar', weekAgo, today],
    queryFn: async () => {
      const res = await adminFetch(`/api/admin/batch/calendar?start_date=${weekAgo}&end_date=${today}`);
      if (!res.ok) throw new Error('Failed');
      return res.json() as Promise<{ batches: Batch[] }>;
    },
  });

  // Create delivery window
  const createWindowMutation = useMutation({
    mutationFn: async (data: typeof newWindow) => {
      const res = await adminFetch('/api/admin/delivery-windows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-windows'] });
      toast.success('Delivery window created');
      setShowNewWindow(false);
      setNewWindow({ name: '', order_open_time: '08:00', cutoff_time: '14:00', delivery_start: '16:00', delivery_end: '18:00', max_capacity: 50, days_of_week: null });
    },
    onError: () => toast.error('Failed to create delivery window'),
  });

  // Advance batch
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
      queryClient.invalidateQueries({ queryKey: ['today-batches'] });
      toast.success('Batch status advanced');
    },
    onError: () => toast.error('Failed to advance batch'),
  });

  // Revert batch
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
      queryClient.invalidateQueries({ queryKey: ['today-batches'] });
      toast.success('Batch status reverted');
    },
    onError: () => toast.error('Failed to revert batch'),
  });

  // Edit delivery window
  const [editingWindowId, setEditingWindowId] = useState<string | null>(null);
  const [editWindow, setEditWindow] = useState<Partial<DeliveryWindow>>({});

  const updateWindowMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DeliveryWindow> }) => {
      const res = await adminFetch(`/api/admin/delivery-windows/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-windows'] });
      toast.success('Delivery window updated');
      setEditingWindowId(null);
    },
    onError: () => toast.error('Failed to update delivery window'),
  });

  const startEdit = (w: DeliveryWindow) => {
    setEditingWindowId(w.id);
    setEditWindow({ ...w });
  };

  const cancelEdit = () => {
    setEditingWindowId(null);
    setEditWindow({});
  };

  const saveEdit = () => {
    if (!editingWindowId) return;
    updateWindowMutation.mutate({ id: editingWindowId, data: editWindow });
  };

  // Delete delivery window
  const deleteWindowMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await adminFetch(`/api/admin/delivery-windows/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-windows'] });
      queryClient.invalidateQueries({ queryKey: ['today-batches'] });
      queryClient.invalidateQueries({ queryKey: ['order-window-status'] });
      toast.success('Delivery window deactivated');
    },
    onError: () => toast.error('Failed to delete delivery window'),
  });

  if (windowsLoading || batchesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Batch Management</h1>
          <p className="text-muted-foreground mt-1 text-sm">Configure delivery windows and manage daily batches</p>
        </div>
      </div>

      {/* Today's Batches */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Today&apos;s Batches</h2>
        {batchesData?.batches && batchesData.batches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {batchesData.batches.map((batch) => {
              const sc = STATUS_COLORS[batch.status] || STATUS_COLORS.accepting;
              const activeOrders = batch.orders_placed ?? batch.total_orders ?? 0;
              const stops = batch.delivery_stops ?? 0;
              const pct = batch.max_capacity > 0 ? Math.round((activeOrders / batch.max_capacity) * 100) : 0;
              return (
                <Card key={batch.batch_id} className="bg-card border-border">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-foreground">{batch.window_name}</span>
                      <Badge className={`${sc.bg} ${sc.text} border-0 text-xs`}>
                        {batch.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{batch.delivery_window}</p>

                    {/* Stops + capacity bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>
                          <span className="text-foreground font-semibold">{stops}</span> stops
                          <span className="ml-2 opacity-70">({activeOrders} {activeOrders === 1 ? 'order' : 'orders'})</span>
                        </span>
                        <span>{pct}% / {batch.max_capacity} max</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${pct >= 80 ? 'bg-orange-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {batch.status !== 'completed' && batch.status !== 'cancelled' && (
                        <>
                          <Button
                            onClick={() => revertMutation.mutate(batch.batch_id)}
                            disabled={batch.status === 'accepting' || revertMutation.isPending}
                            size="sm"
                            variant="outline"
                            className="flex-1 text-muted-foreground border-border hover:bg-muted hover:text-foreground bg-transparent text-xs disabled:opacity-30"
                          >
                            <ChevronLeft className="h-3 w-3 mr-1" />
                            Revert
                          </Button>
                          <Button
                            onClick={() => advanceMutation.mutate(batch.batch_id)}
                            disabled={advanceMutation.isPending}
                            size="sm"
                            className="flex-1 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white text-xs"
                          >
                            Advance
                            <ChevronRight className="h-3 w-3 ml-1" />
                          </Button>
                        </>
                      )}
                      <Button
                        onClick={() => router.push(`/admin/batches/${batch.batch_id}/orders`)}
                        size="sm"
                        variant="outline"
                        className="text-muted-foreground border-border hover:bg-muted hover:text-foreground bg-transparent text-xs"
                      >
                        <List className="h-3 w-3 mr-1" />
                        Orders
                      </Button>
                      <Button
                        onClick={() => router.push(`/admin/batches/${batch.batch_id}/map`)}
                        size="sm"
                        variant="outline"
                        className="text-muted-foreground border-border hover:bg-muted hover:text-foreground bg-transparent text-xs"
                      >
                        <Map className="h-3 w-3 mr-1" />
                        Map
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="bg-card border-border">
            <CardContent className="py-8 text-center text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No batches for today. They will be created automatically from delivery windows.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delivery Windows Configuration */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">Delivery Windows</h2>
          <Button
            onClick={() => setShowNewWindow(!showNewWindow)}
            size="sm"
            variant="outline"
            className="text-muted-foreground border-border hover:bg-muted hover:text-foreground bg-transparent text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            New Window
          </Button>
        </div>

        {/* New Window Form */}
        {showNewWindow && (
          <Card className="bg-card border-orange-500/30 mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-orange-400">Create Delivery Window</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Window Name</Label>
                <Input
                  value={newWindow.name}
                  onChange={(e) => setNewWindow({ ...newWindow, name: e.target.value })}
                  placeholder="e.g., Afternoon Batch"
                  className="bg-background border-border text-foreground text-sm h-9"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Orders Open</Label>
                  <Input type="time" value={newWindow.order_open_time} onChange={(e) => setNewWindow({ ...newWindow, order_open_time: e.target.value })} className="bg-background border-border text-foreground text-sm h-9" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Order Cutoff</Label>
                  <Input type="time" value={newWindow.cutoff_time} onChange={(e) => setNewWindow({ ...newWindow, cutoff_time: e.target.value })} className="bg-background border-border text-foreground text-sm h-9" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Delivery Start</Label>
                  <Input type="time" value={newWindow.delivery_start} onChange={(e) => setNewWindow({ ...newWindow, delivery_start: e.target.value })} className="bg-background border-border text-foreground text-sm h-9" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Delivery End</Label>
                  <Input type="time" value={newWindow.delivery_end} onChange={(e) => setNewWindow({ ...newWindow, delivery_end: e.target.value })} className="bg-background border-border text-foreground text-sm h-9" />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Max Capacity</Label>
                <Input type="number" value={newWindow.max_capacity} onChange={(e) => setNewWindow({ ...newWindow, max_capacity: parseInt(e.target.value) || 50 })} className="bg-background border-border text-foreground text-sm h-9" />
              </div>
              <DaysOfWeekPicker
                value={newWindow.days_of_week}
                onChange={(days_of_week) => setNewWindow({ ...newWindow, days_of_week })}
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => createWindowMutation.mutate(newWindow)}
                  disabled={
                    createWindowMutation.isPending ||
                    !newWindow.name ||
                    (newWindow.days_of_week !== null && newWindow.days_of_week.length === 0)
                  }
                  size="sm"
                  className="bg-gradient-to-r from-red-600 to-orange-500 text-white text-xs"
                >
                  {createWindowMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  Create
                </Button>
                <Button onClick={() => setShowNewWindow(false)} size="sm" variant="ghost" className="text-muted-foreground text-xs">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Existing Windows */}
        <div className="space-y-2">
          {windowsData?.windows.map((w) => (
            <div key={w.id}>
              {editingWindowId === w.id ? (
                /* Inline edit form */
                <div className="p-4 bg-card rounded-xl border border-blue-500/30 space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Window Name</Label>
                    <Input value={editWindow.name || ''} onChange={(e) => setEditWindow({ ...editWindow, name: e.target.value })} className="bg-background border-border text-foreground text-sm h-9" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Orders Open</Label>
                      <Input type="time" value={editWindow.order_open_time || ''} onChange={(e) => setEditWindow({ ...editWindow, order_open_time: e.target.value })} className="bg-background border-border text-foreground text-sm h-9" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Order Cutoff</Label>
                      <Input type="time" value={editWindow.cutoff_time || ''} onChange={(e) => setEditWindow({ ...editWindow, cutoff_time: e.target.value })} className="bg-background border-border text-foreground text-sm h-9" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Delivery Start</Label>
                      <Input type="time" value={editWindow.delivery_start || ''} onChange={(e) => setEditWindow({ ...editWindow, delivery_start: e.target.value })} className="bg-background border-border text-foreground text-sm h-9" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Delivery End</Label>
                      <Input type="time" value={editWindow.delivery_end || ''} onChange={(e) => setEditWindow({ ...editWindow, delivery_end: e.target.value })} className="bg-background border-border text-foreground text-sm h-9" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Max Capacity</Label>
                    <Input type="number" value={editWindow.max_capacity || 50} onChange={(e) => setEditWindow({ ...editWindow, max_capacity: parseInt(e.target.value) || 50 })} className="bg-background border-border text-foreground text-sm h-9" />
                  </div>
                  <DaysOfWeekPicker
                    value={editWindow.days_of_week ?? null}
                    onChange={(days_of_week) => setEditWindow({ ...editWindow, days_of_week })}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={saveEdit}
                      disabled={
                        updateWindowMutation.isPending ||
                        (editWindow.days_of_week !== null && editWindow.days_of_week !== undefined && editWindow.days_of_week.length === 0)
                      }
                      size="sm"
                      className="bg-green-600 hover:bg-green-500 text-white text-xs"
                    >
                      {updateWindowMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                      Save
                    </Button>
                    <Button onClick={cancelEdit} size="sm" variant="ghost" className="text-muted-foreground text-xs">
                      <X className="h-3 w-3 mr-1" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                /* Display row */
                <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border">
                  <div className="flex items-center gap-4">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{w.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Orders {formatTime(w.order_open_time)} – {formatTime(w.cutoff_time)} · Delivery {formatTime(w.delivery_start)} – {formatTime(w.delivery_end)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Active days: <span className="text-foreground">{formatDaysOfWeek(w.days_of_week)}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">Max {w.max_capacity}</span>
                    <Badge className={w.is_active ? 'bg-green-500/20 text-green-400 border-0' : 'bg-gray-500/20 text-muted-foreground border-0'}>
                      {w.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Button onClick={() => startEdit(w)} size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground h-8 w-8 p-0">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      onClick={() => {
                        if (confirm(`Deactivate "${w.name}"? This will prevent new batches from being created for this window.`)) {
                          deleteWindowMutation.mutate(w.id);
                        }
                      }}
                      disabled={deleteWindowMutation.isPending}
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:text-red-300 hover:bg-red-950/30 h-8 w-8 p-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {(!windowsData?.windows || windowsData.windows.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">No delivery windows configured yet.</p>
          )}
        </div>
      </div>

      {/* Recent Batches History */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Recent Batches</h2>
        <div className="space-y-2">
          {calendarData?.batches.map((b) => {
            const sc = STATUS_COLORS[b.status] || STATUS_COLORS.accepting;
            return (
              <div
                key={b.id}
                className="flex items-center justify-between p-3 bg-card rounded-lg border border-border cursor-pointer hover:border-border transition-colors"
                onClick={() => router.push(`/admin/batches/${b.id}/orders`)}
              >
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground w-20">{b.delivery_date}</span>
                  <span className="text-sm font-medium text-foreground">{b.window_name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground">
                    <span className="text-foreground font-semibold">{b.delivery_stops ?? 0}</span> stops
                    <span className="ml-2 opacity-70">({b.total_orders} {b.total_orders === 1 ? 'order' : 'orders'})</span>
                  </span>
                  <Badge className={`${sc.bg} ${sc.text} border-0 text-xs capitalize`}>
                    {b.status}
                  </Badge>
                  <Button
                    onClick={(e) => { e.stopPropagation(); router.push(`/admin/batches/${b.id}/map`); }}
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground hover:text-foreground h-7 px-2 text-xs"
                  >
                    <Map className="h-3 w-3 mr-1" />
                    Map
                  </Button>
                </div>
              </div>
            );
          })}
          {(!calendarData?.batches || calendarData.batches.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">No batch history yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
