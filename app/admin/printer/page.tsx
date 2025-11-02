'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Printer, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function PrinterStatusPage() {
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [queueStatus, setQueueStatus] = useState<any>(null);
  const [loadingQueue, setLoadingQueue] = useState(false);

  const testPrint = async () => {
    setTesting(true);
    try {
      const response = await fetch('/api/print/test', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success('Test print sent! Check your printer.');
        setStatus(data);
      } else {
        toast.error(`Print failed: ${data.error || data.message}`);
        setStatus(data);
      }
    } catch (error) {
      toast.error('Failed to send test print');
      console.error(error);
    } finally {
      setTesting(false);
    }
  };

  const checkPrinterStatus = async () => {
    setTesting(true);
    try {
      const response = await fetch('/api/printer/status');
      const data = await response.json();
      setStatus(data);
      
      if (data.ready) {
        toast.success('Printer is ready!');
      } else {
        toast.warning('Printer has issues');
      }
    } catch (error) {
      toast.error('Failed to check printer status');
      console.error(error);
    } finally {
      setTesting(false);
    }
  };

  const checkQueue = async () => {
    setLoadingQueue(true);
    try {
      const response = await fetch('/api/print/queue-status');
      const data = await response.json();
      setQueueStatus(data);
    } catch (error) {
      toast.error('Failed to check queue');
      console.error(error);
    } finally {
      setLoadingQueue(false);
    }
  };

  const processQueue = async () => {
    setTesting(true);
    try {
      const response = await fetch('/api/print/process-queue', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + prompt('Enter PRINT_PROCESSOR_SECRET:'),
        },
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success(`Processed ${data.result.processed} jobs: ${data.result.succeeded} succeeded, ${data.result.failed} failed`);
        // Refresh queue status
        checkQueue();
      } else {
        toast.error(`Failed: ${data.error || data.message}`);
      }
      console.log('Process queue result:', data);
    } catch (error) {
      toast.error('Failed to process queue');
      console.error(error);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Printer Status & Testing</h1>
        <p className="text-muted-foreground">
          Test printer connectivity and view print queue status
        </p>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Test printer and check status</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={testPrint} disabled={testing}>
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Printing...
              </>
            ) : (
              <>
                <Printer className="mr-2 h-4 w-4" />
                Send Test Print
              </>
            )}
          </Button>
          
          <Button onClick={checkPrinterStatus} variant="outline" disabled={testing}>
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              'Check Printer Status'
            )}
          </Button>

          <Button onClick={checkQueue} variant="outline" disabled={loadingQueue}>
            {loadingQueue ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Check Print Queue'
            )}
          </Button>

          <Button onClick={processQueue} variant="default" disabled={testing}>
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Process Queue Now'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Printer Status */}
      {status && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {status.success || status.ready ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Printer Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={status.success || status.ready ? 'default' : 'destructive'}>
                  {status.success || status.ready ? 'Ready' : 'Error'}
                </Badge>
              </div>
              
              {status.config && (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">IP Address</p>
                    <p className="font-mono">{status.config.host}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Port</p>
                    <p className="font-mono">{status.config.port}</p>
                  </div>
                </>
              )}
              
              {status.message && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Message</p>
                  <p>{status.message}</p>
                </div>
              )}

              {status.error && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Error</p>
                  <p className="text-red-500">{status.error}</p>
                </div>
              )}
            </div>

            {/* Detailed Status */}
            {status.printer && (
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Detailed Status</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    {status.printer.connected ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span>Connected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {status.printer.online ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span>Online</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {status.printer.coverClosed ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                    )}
                    <span>Cover Closed</span>
                  </div>
                </div>
              </div>
            )}

            {status.paper && (
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Paper Status</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    {status.paper.paperPresent ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span>Paper Present</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {status.paper.paperNearEnd ? (
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    <span>{status.paper.paperNearEnd ? 'Paper Low' : 'Paper OK'}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Queue Status */}
      {queueStatus && (
        <Card>
          <CardHeader>
            <CardTitle>Print Queue Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{queueStatus.pending || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Printed</p>
                <p className="text-2xl font-bold text-green-500">{queueStatus.printed || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-red-500">{queueStatus.failed || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Troubleshooting */}
      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <p className="font-semibold">If test print fails:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>Check printer is powered on</li>
              <li>Verify printer IP address is correct</li>
              <li>Ensure VPN is connected (if using remote printer)</li>
              <li>Test connectivity: <code className="bg-muted px-1 rounded">nc -zv PRINTER_IP 9100</code></li>
              <li>Check print worker logs: <code className="bg-muted px-1 rounded">pm2 logs print-worker</code></li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
