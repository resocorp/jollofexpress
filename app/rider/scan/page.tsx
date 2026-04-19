'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Camera, CheckCircle2, Loader2, QrCode, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ScannedOrder {
  id: string;
  order_number: string;
  customer_name: string;
  delivery_address: string | null;
  scanned_at: string;
  already_dispatched: boolean;
}

const SCANNER_REGION_ID = 'rider-scan-region';
const COOLDOWN_MS = 1500; // ignore same token for 1.5s to avoid duplicate scans

export default function RiderScanPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState<ScannedOrder[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);
  const scannerRef = useRef<unknown>(null);
  const recentTokenRef = useRef<{ token: string; at: number } | null>(null);
  const submittingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('rider_token') : null;
    if (!t) {
      router.replace('/rider');
      return;
    }
    setToken(t);
  }, [router]);

  const submitToken = useCallback(
    async (qrToken: string) => {
      if (!token) return;
      if (submittingRef.current.has(qrToken)) return;
      submittingRef.current.add(qrToken);
      try {
        const res = await fetch('/api/rider/scan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ qr_token: qrToken }),
        });
        const data = await res.json();
        if (!res.ok) {
          setLastError(data.error || 'Scan failed');
          toast.error(data.error || 'Scan failed');
          return;
        }
        setLastError(null);
        const entry: ScannedOrder = {
          id: data.order.id,
          order_number: data.order.order_number,
          customer_name: data.order.customer_name,
          delivery_address: data.order.delivery_address,
          scanned_at: new Date().toISOString(),
          already_dispatched: !!data.already_dispatched,
        };
        setScanned((prev) => {
          if (prev.some((o) => o.id === entry.id)) return prev;
          return [entry, ...prev];
        });
        if (data.already_dispatched) {
          toast.info(`Already dispatched: #${data.order.order_number}`);
        } else {
          toast.success(`Dispatched #${data.order.order_number}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Network error';
        setLastError(msg);
        toast.error(msg);
      } finally {
        submittingRef.current.delete(qrToken);
      }
    },
    [token]
  );

  useEffect(() => {
    if (!scanning || !token) return;
    let cancelled = false;
    let scanner: unknown = null;

    (async () => {
      const mod = await import('html5-qrcode');
      if (cancelled) return;
      const Html5Qrcode = mod.Html5Qrcode as unknown as new (id: string) => {
        start: (
          cameraIdOrConfig: unknown,
          config: unknown,
          onSuccess: (decoded: string) => void,
          onError: (err: string) => void
        ) => Promise<void>;
        stop: () => Promise<void>;
        clear: () => void;
      };

      const instance = new Html5Qrcode(SCANNER_REGION_ID);
      scanner = instance;
      scannerRef.current = instance;

      try {
        await instance.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 260, height: 260 } },
          (decoded: string) => {
            const now = Date.now();
            const recent = recentTokenRef.current;
            if (recent && recent.token === decoded && now - recent.at < COOLDOWN_MS) return;
            recentTokenRef.current = { token: decoded, at: now };
            submitToken(decoded);
          },
          () => {
            // per-frame decode failures are normal — ignore
          }
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Camera error';
        setLastError(`Camera: ${msg}`);
        setScanning(false);
      }
    })();

    return () => {
      cancelled = true;
      const s = scanner as { stop?: () => Promise<void>; clear?: () => void } | null;
      if (s?.stop) {
        s.stop()
          .then(() => s.clear?.())
          .catch(() => {});
      }
    };
  }, [scanning, token, submitToken]);

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container max-w-lg mx-auto p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push('/rider')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <QrCode className="h-5 w-5" /> Scan Dispatch
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {scanning ? 'Point camera at receipt QR' : 'Ready to scan'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            id={SCANNER_REGION_ID}
            className="w-full aspect-square bg-black rounded-md overflow-hidden"
            style={{ display: scanning ? 'block' : 'none' }}
          />
          {!scanning && (
            <div className="w-full aspect-square bg-muted rounded-md flex items-center justify-center text-muted-foreground">
              <div className="flex flex-col items-center gap-2">
                <Camera className="h-10 w-10" />
                <span className="text-sm">Camera off</span>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            {!scanning ? (
              <Button className="flex-1" onClick={() => setScanning(true)}>
                <Camera className="h-4 w-4 mr-2" /> Start scanning
              </Button>
            ) : (
              <Button variant="outline" className="flex-1" onClick={() => setScanning(false)}>
                Stop
              </Button>
            )}
          </div>
          {lastError && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <XCircle className="h-3 w-3" /> {lastError}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Scanned this run</span>
            <Badge variant="secondary">{scanned.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {scanned.length === 0 && (
            <p className="text-sm text-muted-foreground">No orders scanned yet.</p>
          )}
          {scanned.map((o) => (
            <div
              key={o.id}
              className="flex items-start gap-2 p-2 border rounded-md text-sm"
            >
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  #{o.order_number} — {o.customer_name}
                </div>
                {o.delivery_address && (
                  <div className="text-xs text-muted-foreground truncate">
                    {o.delivery_address}
                  </div>
                )}
                {o.already_dispatched && (
                  <Badge variant="outline" className="mt-1 text-xs">
                    already dispatched
                  </Badge>
                )}
              </div>
            </div>
          ))}
          {scanned.length > 0 && (
            <Button
              variant="default"
              className="w-full mt-2"
              onClick={() => router.push('/rider')}
            >
              Start delivery run ({scanned.length})
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
