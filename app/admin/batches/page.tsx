'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Clock, Package, ChevronRight, ChevronLeft, Pencil, X, Check } from 'lucide-react';
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
  total_orders: number;
  max_capacity: number;
  delivery_window: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  accepting: { bg: 'bg-green-500/20', text: 'text-green-400' },
  cutoff: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  preparing: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  dispatching: { bg: 'bg-indigo-500/20', text: 'text-indigo-400' },
  completed: { bg: 'bg-gray-500/20', text: 'text-gray-400' },
  cancelled: { bg: 'bg-red-500/20', text: 'text-red-400' },
};

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
}

export default function BatchesPage() {
  const queryClient = useQueryClient();
  const [showNewWindow, setShowNewWindow] = useState(false);
  const [newWindow, setNewWindow] = useState({
    name: '',
    order_open_time: '08:00',
    cutoff_time: '14:00',
    delivery_start: '16:00',
    delivery_end: '18:00',
    max_capacity: 50,
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
      setNewWindow({ name: '', order_open_time: '08:00', cutoff_time: '14:00', delivery_start: '16:00', delivery_end: '18:00', max_capacity: 50 });
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

  if (windowsLoading || batchesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Batch Management</h1>
          <p className="text-gray-500 mt-1 text-sm">Configure delivery windows and manage daily batches</p>
        </div>
      </div>

      {/* Today's Batches */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Today&apos;s Batches</h2>
        {batchesData?.batches && batchesData.batches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {batchesData.batches.map((batch) => {
              const sc = STATUS_COLORS[batch.status] || STATUS_COLORS.accepting;
              const pct = batch.max_capacity > 0 ? Math.round((batch.total_orders / batch.max_capacity) * 100) : 0;
              return (
                <Card key={batch.batch_id} className="bg-[#161822] border-[#1F2233]">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-white">{batch.window_name}</span>
                      <Badge className={`${sc.bg} ${sc.text} border-0 text-xs`}>
                        {batch.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">{batch.delivery_window}</p>
                    
                    {/* Capacity bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{batch.total_orders} orders</span>
                        <span>{pct}% / {batch.max_capacity} max</span>
                      </div>
                      <div className="w-full h-2 bg-[#1F2233] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${pct >= 80 ? 'bg-orange-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>

                    {batch.status !== 'completed' && batch.status !== 'cancelled' && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => revertMutation.mutate(batch.batch_id)}
                          disabled={batch.status === 'accepting' || revertMutation.isPending}
                          size="sm"
                          variant="outline"
                          className="flex-1 text-gray-400 border-[#1F2233] hover:bg-[#1F2233] hover:text-white bg-transparent text-xs disabled:opacity-30"
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
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="bg-[#161822] border-[#1F2233]">
            <CardContent className="py-8 text-center text-gray-500">
              <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No batches for today. They will be created automatically from delivery windows.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delivery Windows Configuration */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">Delivery Windows</h2>
          <Button
            onClick={() => setShowNewWindow(!showNewWindow)}
            size="sm"
            variant="outline"
            className="text-gray-400 border-[#1F2233] hover:bg-[#1F2233] hover:text-white bg-transparent text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            New Window
          </Button>
        </div>

        {/* New Window Form */}
        {showNewWindow && (
          <Card className="bg-[#161822] border-orange-500/30 mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-orange-400">Create Delivery Window</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs text-gray-400">Window Name</Label>
                <Input
                  value={newWindow.name}
                  onChange={(e) => setNewWindow({ ...newWindow, name: e.target.value })}
                  placeholder="e.g., Afternoon Batch"
                  className="bg-[#0F1117] border-[#1F2233] text-white text-sm h-9"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-400">Orders Open</Label>
                  <Input type="time" value={newWindow.order_open_time} onChange={(e) => setNewWindow({ ...newWindow, order_open_time: e.target.value })} className="bg-[#0F1117] border-[#1F2233] text-white text-sm h-9" />
                </div>
                <div>
                  <Label className="text-xs text-gray-400">Order Cutoff</Label>
                  <Input type="time" value={newWindow.cutoff_time} onChange={(e) => setNewWindow({ ...newWindow, cutoff_time: e.target.value })} className="bg-[#0F1117] border-[#1F2233] text-white text-sm h-9" />
                </div>
                <div>
                  <Label className="text-xs text-gray-400">Delivery Start</Label>
                  <Input type="time" value={newWindow.delivery_start} onChange={(e) => setNewWindow({ ...newWindow, delivery_start: e.target.value })} className="bg-[#0F1117] border-[#1F2233] text-white text-sm h-9" />
                </div>
                <div>
                  <Label className="text-xs text-gray-400">Delivery End</Label>
                  <Input type="time" value={newWindow.delivery_end} onChange={(e) => setNewWindow({ ...newWindow, delivery_end: e.target.value })} className="bg-[#0F1117] border-[#1F2233] text-white text-sm h-9" />
                </div>
              </div>
              <div>
                <Label className="text-xs text-gray-400">Max Capacity</Label>
                <Input type="number" value={newWindow.max_capacity} onChange={(e) => setNewWindow({ ...newWindow, max_capacity: parseInt(e.target.value) || 50 })} className="bg-[#0F1117] border-[#1F2233] text-white text-sm h-9" />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => createWindowMutation.mutate(newWindow)}
                  disabled={createWindowMutation.isPending || !newWindow.name}
                  size="sm"
                  className="bg-gradient-to-r from-red-600 to-orange-500 text-white text-xs"
                >
                  {createWindowMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  Create
                </Button>
                <Button onClick={() => setShowNewWindow(false)} size="sm" variant="ghost" className="text-gray-400 text-xs">
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
                <div className="p-4 bg-[#161822] rounded-xl border border-blue-500/30 space-y-3">
                  <div>
                    <Label className="text-xs text-gray-400">Window Name</Label>
                    <Input value={editWindow.name || ''} onChange={(e) => setEditWindow({ ...editWindow, name: e.target.value })} className="bg-[#0F1117] border-[#1F2233] text-white text-sm h-9" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-400">Orders Open</Label>
                      <Input type="time" value={editWindow.order_open_time || ''} onChange={(e) => setEditWindow({ ...editWindow, order_open_time: e.target.value })} className="bg-[#0F1117] border-[#1F2233] text-white text-sm h-9" />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-400">Order Cutoff</Label>
                      <Input type="time" value={editWindow.cutoff_time || ''} onChange={(e) => setEditWindow({ ...editWindow, cutoff_time: e.target.value })} className="bg-[#0F1117] border-[#1F2233] text-white text-sm h-9" />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-400">Delivery Start</Label>
                      <Input type="time" value={editWindow.delivery_start || ''} onChange={(e) => setEditWindow({ ...editWindow, delivery_start: e.target.value })} className="bg-[#0F1117] border-[#1F2233] text-white text-sm h-9" />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-400">Delivery End</Label>
                      <Input type="time" value={editWindow.delivery_end || ''} onChange={(e) => setEditWindow({ ...editWindow, delivery_end: e.target.value })} className="bg-[#0F1117] border-[#1F2233] text-white text-sm h-9" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Max Capacity</Label>
                    <Input type="number" value={editWindow.max_capacity || 50} onChange={(e) => setEditWindow({ ...editWindow, max_capacity: parseInt(e.target.value) || 50 })} className="bg-[#0F1117] border-[#1F2233] text-white text-sm h-9" />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={saveEdit} disabled={updateWindowMutation.isPending} size="sm" className="bg-green-600 hover:bg-green-500 text-white text-xs">
                      {updateWindowMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                      Save
                    </Button>
                    <Button onClick={cancelEdit} size="sm" variant="ghost" className="text-gray-400 text-xs">
                      <X className="h-3 w-3 mr-1" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                /* Display row */
                <div className="flex items-center justify-between p-4 bg-[#161822] rounded-xl border border-[#1F2233]">
                  <div className="flex items-center gap-4">
                    <Clock className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-white">{w.name}</p>
                      <p className="text-xs text-gray-500">
                        Orders {formatTime(w.order_open_time)} – {formatTime(w.cutoff_time)} · Delivery {formatTime(w.delivery_start)} – {formatTime(w.delivery_end)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">Max {w.max_capacity}</span>
                    <Badge className={w.is_active ? 'bg-green-500/20 text-green-400 border-0' : 'bg-gray-500/20 text-gray-500 border-0'}>
                      {w.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Button onClick={() => startEdit(w)} size="sm" variant="ghost" className="text-gray-500 hover:text-white h-8 w-8 p-0">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {(!windowsData?.windows || windowsData.windows.length === 0) && (
            <p className="text-sm text-gray-500 text-center py-4">No delivery windows configured yet.</p>
          )}
        </div>
      </div>

      {/* Recent Batches History */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Recent Batches</h2>
        <div className="space-y-2">
          {calendarData?.batches.map((b) => {
            const sc = STATUS_COLORS[b.status] || STATUS_COLORS.accepting;
            return (
              <div key={b.id} className="flex items-center justify-between p-3 bg-[#161822] rounded-lg border border-[#1F2233]">
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500 w-20">{b.delivery_date}</span>
                  <span className="text-sm font-medium text-white">{b.window_name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500">{b.total_orders} orders</span>
                  <Badge className={`${sc.bg} ${sc.text} border-0 text-xs capitalize`}>
                    {b.status}
                  </Badge>
                </div>
              </div>
            );
          })}
          {(!calendarData?.batches || calendarData.batches.length === 0) && (
            <p className="text-sm text-gray-500 text-center py-4">No batch history yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
