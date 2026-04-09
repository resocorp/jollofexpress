'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Send, 
  CheckCircle, 
  XCircle, 
  Settings,
  History,
  TrendingUp,
  Loader2,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNotificationStats } from '@/hooks/use-notifications';
import { adminFetch } from '@/lib/api-client';
import { toast } from 'sonner';

interface WhatsAppStatus {
  status: string;
  uptime: number;
  messages_sent_last_minute?: number;
  rate_limit?: number;
  error?: string;
}

interface QRResponse {
  status: string;
  qr: string | null;
  message?: string;
}

export default function NotificationCenterPage() {
  const { data: stats, isLoading } = useNotificationStats();
  const [manualPhone, setManualPhone] = useState('');
  const [manualMessage, setManualMessage] = useState('');

  // WhatsApp status
  const { data: waStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['whatsapp-status'],
    queryFn: async (): Promise<WhatsAppStatus> => {
      const res = await adminFetch('/api/admin/whatsapp/status');
      return res.json();
    },
    refetchInterval: 10000,
  });

  // QR code
  const { data: qrData, refetch: refetchQR } = useQuery({
    queryKey: ['whatsapp-qr'],
    queryFn: async (): Promise<QRResponse> => {
      const res = await adminFetch('/api/admin/whatsapp/qr');
      return res.json();
    },
    refetchInterval: waStatus?.status === 'awaiting_scan' ? 3000 : 30000,
  });

  // Reconnect
  const reconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await adminFetch('/api/admin/whatsapp/reconnect', { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Reconnection initiated');
      refetchStatus();
      refetchQR();
    },
    onError: () => toast.error('Failed to reconnect'),
  });

  // Send test message
  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await adminFetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: manualPhone }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Test notification sent');
      setManualPhone('');
      setManualMessage('');
    },
    onError: () => toast.error('Failed to send'),
  });

  const successRate = stats?.successRate || 0;
  const waConnected = waStatus?.status === 'connected';
  const waAwaiting = waStatus?.status === 'awaiting_scan';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notification Center</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage WhatsApp notifications via Baileys</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/notifications/settings">
            <Button variant="outline" size="sm" className="text-muted-foreground border-border hover:bg-muted hover:text-foreground bg-transparent text-xs">
              <Settings className="h-3 w-3 mr-1" />
              Settings
            </Button>
          </Link>
          <Link href="/admin/notifications/logs">
            <Button variant="outline" size="sm" className="text-muted-foreground border-border hover:bg-muted hover:text-foreground bg-transparent text-xs">
              <History className="h-3 w-3 mr-1" />
              Logs
            </Button>
          </Link>
        </div>
      </div>

      {/* WhatsApp Connection Status */}
      <div className="bg-card rounded-xl p-5 border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            WhatsApp (Baileys)
          </h3>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => reconnectMutation.mutate()}
              disabled={reconnectMutation.isPending}
              size="sm"
              variant="outline"
              className="text-muted-foreground border-border hover:bg-muted hover:text-foreground bg-transparent text-xs h-8"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${reconnectMutation.isPending ? 'animate-spin' : ''}`} />
              Reconnect
            </Button>
            <Badge className={`text-xs border ${
              waConnected ? 'bg-green-500/20 text-green-400 border-green-500/30'
              : waAwaiting ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
              : 'bg-red-500/20 text-red-400 border-red-500/30'
            }`}>
              {waStatus?.status || 'checking...'}
            </Badge>
          </div>
        </div>

        {/* QR Code display when awaiting scan */}
        {waAwaiting && qrData?.qr && (
          <div className="flex items-start gap-5 p-4 bg-background rounded-lg border border-border">
            <div className="flex-shrink-0 bg-white p-2 rounded-lg">
              <img src={qrData.qr} alt="WhatsApp QR Code" width={160} height={160} />
            </div>
            <div>
              <p className="text-sm text-foreground mb-2">To connect WhatsApp:</p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Open WhatsApp on your business phone</li>
                <li>Go to Settings → Linked Devices → Link a Device</li>
                <li>Scan the QR code shown here</li>
              </ol>
            </div>
          </div>
        )}

        {/* Connected status */}
        {waConnected && (
          <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
            <p className="text-sm text-green-400">
              WhatsApp connected and active. Notifications will be sent via WhatsApp.
            </p>
            {waStatus?.uptime && (
              <p className="text-xs text-green-500/70 mt-1">
                Uptime: {Math.floor(waStatus.uptime / 60)}m · Messages/min: {waStatus.messages_sent_last_minute || 0}/{waStatus.rate_limit || 30}
              </p>
            )}
          </div>
        )}

        {/* Disconnected / unreachable */}
        {!waConnected && !waAwaiting && (
          <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
            <p className="text-sm text-red-400">
              {waStatus?.error || 'WhatsApp is disconnected. Click "Reconnect" to generate a new QR code.'}
            </p>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Sent', value: stats?.total || 0, color: '#3B82F6', icon: Send },
          { label: 'Delivered', value: stats?.sent || 0, color: '#10B981', icon: CheckCircle },
          { label: 'Failed', value: stats?.failed || 0, color: '#EF4444', icon: XCircle },
          { label: 'Success Rate', value: `${successRate}%`, color: successRate >= 90 ? '#10B981' : successRate >= 70 ? '#F59E0B' : '#EF4444', icon: TrendingUp },
        ].map((s, i) => (
          <div key={i} className="bg-card rounded-xl p-5 border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{s.label}</span>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-extrabold" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Manual Send */}
      <div className="bg-card rounded-xl p-5 border border-border">
        <h3 className="text-sm font-semibold text-foreground mb-3">Send Test Message</h3>
        <div className="flex gap-3">
          <Input
            value={manualPhone}
            onChange={(e) => setManualPhone(e.target.value)}
            placeholder="Phone number (e.g., 08099988875)"
            className="bg-background border-border text-foreground text-sm h-9 flex-1"
          />
          <Button
            onClick={() => sendMutation.mutate()}
            disabled={sendMutation.isPending || !manualPhone}
            size="sm"
            className="bg-gradient-to-r from-red-600 to-orange-500 text-white text-xs h-9"
          >
            {sendMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
            Send Test
          </Button>
        </div>
      </div>

      {/* Info */}
      <div className="bg-card rounded-xl p-5 border border-border">
        <h3 className="text-sm font-semibold text-foreground mb-2">About WhatsApp Notifications</h3>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <p><strong className="text-muted-foreground">Customer:</strong> Sent on order placement, batch preparing, dispatch, and delivery.</p>
          <p><strong className="text-muted-foreground">Admin:</strong> Kitchen alerts, payment failures, daily summaries.</p>
          <p><strong className="text-muted-foreground">Powered by Baileys:</strong> Free, open-source WhatsApp Web connection running as a PM2 sidecar process.</p>
        </div>
      </div>
    </div>
  );
}
