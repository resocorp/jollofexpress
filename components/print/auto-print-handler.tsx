'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PrintReceipt } from './print-receipt';
import type { ReceiptData } from '@/lib/print/format-receipt';
import { toast } from 'sonner';

interface PrintJob {
  id: string;
  order_id: string;
  print_data: ReceiptData;
  status: 'pending' | 'printed' | 'failed';
  created_at: string;
}

/**
 * Auto-print handler component
 * Monitors print_queue table via Supabase realtime
 * Automatically triggers browser print when new jobs arrive
 */
export function AutoPrintHandler() {
  const [printQueue, setPrintQueue] = useState<PrintJob[]>([]);
  const [currentJob, setCurrentJob] = useState<PrintJob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);

  // Initialize Supabase client
  useEffect(() => {
    if (!supabaseRef.current) {
      try {
        supabaseRef.current = createClient();
        console.log('✅ Supabase client initialized for print handler');
      } catch (error) {
        console.error('❌ Failed to initialize Supabase client:', error);
        toast.error('Print handler initialization failed. Check console for details.');
      }
    }
  }, []);

  // Fetch pending print jobs on mount
  useEffect(() => {
    const fetchPendingJobs = async () => {
      if (!supabaseRef.current) return;

      const { data, error } = await supabaseRef.current
        .from('print_queue')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching print queue:', error);
        return;
      }

      if (data && data.length > 0) {
        console.log(`Found ${data.length} pending print job(s)`);
        setPrintQueue(data as PrintJob[]);
      }
    };

    fetchPendingJobs();
  }, []);

  // Subscribe to new print jobs via realtime
  useEffect(() => {
    if (!supabaseRef.current) return;

    console.log('🖨️  Print handler: Subscribing to print_queue changes');

    const channel = supabaseRef.current
      .channel('print_queue_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'print_queue',
          filter: 'status=eq.pending',
        },
        (payload: any) => {
          console.log('🖨️  New print job received:', payload.new);
          const newJob = payload.new as PrintJob;
          
          // Check if job already in queue (prevent duplicates)
          setPrintQueue((prev) => {
            const exists = prev.some(j => j.id === newJob.id);
            if (exists) {
              console.warn('⚠️  Duplicate print job ignored:', newJob.id);
              return prev;
            }
            console.log('✅ Adding job to queue:', newJob.id);
            return [...prev, newJob];
          });
          
          toast.info(`New print job: Order ${newJob.print_data?.orderNumber || 'Unknown'}`);
        }
      )
      .subscribe((status: any) => {
        console.log('Print queue subscription status:', status);
      });

    return () => {
      console.log('🖨️  Print handler: Unsubscribing from print_queue');
      channel.unsubscribe();
    };
  }, []);

  // Process print queue
  useEffect(() => {
    const processQueue = async () => {
      // If already processing or no jobs, skip
      if (isProcessing || printQueue.length === 0) return;

      setIsProcessing(true);
      const job = printQueue[0];
      setCurrentJob(job);

      console.log(`🖨️  Processing print job: ${job.id}`);

      // Wait a moment for the DOM to render
      await new Promise((resolve) => setTimeout(resolve, 500));

      try {
        // Trigger browser print
        await handlePrint(job);

        // Mark as printed
        if (supabaseRef.current) {
          const { error } = await supabaseRef.current
            .from('print_queue')
            .update({
              status: 'printed',
              processed_at: new Date().toISOString(),
            })
            .eq('id', job.id);

          if (error) {
            console.error('Error updating print job status:', error);
          } else {
            console.log(`✓ Print job ${job.id} marked as printed`);
            toast.success(`Printed: Order ${job.print_data?.orderNumber}`);
          }
        }

        // Remove from queue
        setPrintQueue((prev) => prev.filter((j) => j.id !== job.id));
      } catch (error) {
        console.error('Print error:', error);
        
        // Mark as failed
        if (supabaseRef.current) {
          await supabaseRef.current
            .from('print_queue')
            .update({
              status: 'failed',
              error_message: error instanceof Error ? error.message : 'Print failed',
            })
            .eq('id', job.id);
        }

        toast.error(`Print failed: Order ${job.print_data?.orderNumber}`);
        
        // Remove from queue
        setPrintQueue((prev) => prev.filter((j) => j.id !== job.id));
      } finally {
        setCurrentJob(null);
        setIsProcessing(false);
      }
    };

    processQueue();
  }, [printQueue, isProcessing]);

  /**
   * Trigger browser print dialog
   */
  const handlePrint = async (job: PrintJob): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        console.log('🖨️  Opening print window for:', job.print_data.orderNumber);
        
        // Create a temporary print window
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        
        if (!printWindow) {
          reject(new Error('Failed to open print window. Please check popup blocker.'));
          return;
        }

        // Get ONLY the receipt content, excluding nested styles
        const receiptElement = printRef.current;
        if (!receiptElement) {
          reject(new Error('Receipt element not found'));
          printWindow.close();
          return;
        }

        // Clone the element and extract content AND styles
        const clone = receiptElement.cloneNode(true) as HTMLElement;
        
        // Extract the style tag content
        const styleTag = clone.querySelector('style');
        const receiptStyles = styleTag ? styleTag.textContent || '' : '';
        
        // Remove style tag from clone (we'll add it to head)
        if (styleTag) {
          styleTag.remove();
        }

        // Write HTML to print window with receipt styles
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Receipt - ${job.print_data.orderNumber}</title>
              <meta charset="UTF-8">
              <style>
                /* Reset */
                * { margin: 0; padding: 0; box-sizing: border-box; }
                
                /* Body */
                body {
                  font-family: 'Courier New', Courier, monospace;
                  padding: 10mm;
                  background: white;
                }
                
                /* Receipt Styles */
                ${receiptStyles}
                
                /* Print-specific */
                @page {
                  margin: 10mm;
                  size: auto;
                }
                
                @media print {
                  body {
                    padding: 0;
                  }
                  .print-receipt {
                    max-width: 100%;
                  }
                }
              </style>
            </head>
            <body>
              ${clone.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();

        // Wait for content to load
        printWindow.onload = () => {
          // Small delay to ensure rendering
          setTimeout(() => {
            printWindow.print();
            
            // Close after print (or if user cancels)
            // Note: This will close immediately, adjust timing if needed
            setTimeout(() => {
              printWindow.close();
              resolve();
            }, 1000);
          }, 500);
        };

        // Fallback if onload doesn't fire
        setTimeout(() => {
          if (!printWindow.closed) {
            printWindow.print();
            setTimeout(() => {
              printWindow.close();
              resolve();
            }, 1000);
          }
        }, 2000);
      } catch (error) {
        reject(error);
      }
    });
  };

  return (
    <>
      {/* Print Status Indicator */}
      {printQueue.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Print Queue: {printQueue.length} job(s)</span>
        </div>
      )}

      {/* Hidden receipt for printing - ONLY render when actively processing */}
      {currentJob && isProcessing && (
        <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '80mm' }}>
          <PrintReceipt ref={printRef} receipt={currentJob.print_data} />
        </div>
      )}

      {/* Debug info - remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 bg-gray-800 text-white px-3 py-2 rounded text-xs z-50 max-w-xs">
          <div className="font-bold mb-1">🖨️ Print Handler Active</div>
          <div>Queue: {printQueue.length}</div>
          <div>Processing: {isProcessing ? 'Yes' : 'No'}</div>
          {currentJob && <div>Current: {currentJob.print_data?.orderNumber}</div>}
        </div>
      )}
    </>
  );
}
