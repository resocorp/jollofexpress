/**
 * Print Queue Processor
 * Processes pending print jobs from the database and sends to network printer
 */

import { createServiceClient } from '@/lib/supabase/service';
import { generateESCPOS } from './escpos-generator';
import { printToNetwork, type PrinterConfig } from './network-printer';
import type { ReceiptData } from './format-receipt';

export interface PrintJob {
  id: string;
  order_id: string;
  print_data: ReceiptData;
  status: 'pending' | 'printed' | 'failed';
  attempts: number;
  error_message?: string;
  created_at: string;
}

export interface ProcessorConfig {
  printer: PrinterConfig;
  maxAttempts?: number;    // Maximum retry attempts (default: 3)
  batchSize?: number;      // Number of jobs to process at once (default: 5)
}

export interface ProcessResult {
  processed: number;
  succeeded: number;
  failed: number;
  errors: Array<{ jobId: string; error: string }>;
}

/**
 * Process pending print jobs from the queue
 */
export async function processPrintQueue(
  config: ProcessorConfig
): Promise<ProcessResult> {
  const supabase = createServiceClient();
  const maxAttempts = config.maxAttempts || 3;
  const batchSize = config.batchSize || 5;

  const result: ProcessResult = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    errors: [],
  };

  try {
    // Fetch pending jobs
    const { data: jobs, error: fetchError } = await supabase
      .from('print_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('attempts', maxAttempts)
      .order('created_at', { ascending: true })
      .limit(batchSize);

    if (fetchError) {
      console.error('Error fetching print queue:', fetchError);
      throw fetchError;
    }

    if (!jobs || jobs.length === 0) {
      console.log('No pending print jobs');
      return result;
    }

    console.log(`Found ${jobs.length} pending print job(s)`);

    // Process each job sequentially
    for (const job of jobs as PrintJob[]) {
      result.processed++;
      
      try {
        console.log(`Processing print job ${job.id} (order: ${job.print_data?.orderNumber})`);
        
        // Increment attempts counter
        const newAttempts = job.attempts + 1;
        
        // Generate ESC/POS commands
        console.log(`  Generating ESC/POS data...`);
        const escposData = generateESCPOS(job.print_data);
        console.log(`  Generated ${escposData.length} bytes`);
        
        // Send to printer (direct, no status verification to avoid timeout)
        console.log(`  Sending to printer ${config.printer.host}:${config.printer.port}...`);
        const printResult = await printToNetwork(escposData, config.printer);
        console.log(`  Print result:`, printResult);
        
        if (printResult.success) {
          // Mark as printed
          const { error: updateError } = await supabase
            .from('print_queue')
            .update({
              status: 'printed',
              processed_at: new Date().toISOString(),
              attempts: newAttempts,
            })
            .eq('id', job.id);

          if (updateError) {
            console.error(`Error updating job ${job.id}:`, updateError);
          } else {
            console.log(`✓ Print job ${job.id} completed successfully`);
            result.succeeded++;
          }
          
          // Update order print status
          await supabase
            .from('orders')
            .update({ print_status: 'printed' })
            .eq('id', job.order_id);
            
        } else {
          // Print failed
          const shouldMarkFailed = newAttempts >= maxAttempts;
          const status = shouldMarkFailed ? 'failed' : 'pending';
          
          const { error: updateError } = await supabase
            .from('print_queue')
            .update({
              status,
              attempts: newAttempts,
              error_message: printResult.message,
            })
            .eq('id', job.id);

          if (updateError) {
            console.error(`Error updating job ${job.id}:`, updateError);
          }

          if (shouldMarkFailed) {
            console.error(`✗ Print job ${job.id} failed permanently (${newAttempts} attempts)`);
            result.failed++;
            result.errors.push({
              jobId: job.id,
              error: printResult.message,
            });
            
            // Update order print status
            await supabase
              .from('orders')
              .update({ print_status: 'failed', print_attempts: newAttempts })
              .eq('id', job.order_id);
          } else {
            console.warn(`⚠ Print job ${job.id} failed, will retry (attempt ${newAttempts}/${maxAttempts})`);
          }
        }
      } catch (error) {
        console.error(`Error processing job ${job.id}:`, error);
        result.errors.push({
          jobId: job.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        
        // Mark as failed
        await supabase
          .from('print_queue')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Processing error',
            attempts: job.attempts + 1,
          })
          .eq('id', job.id);
          
        result.failed++;
      }

      // Small delay between prints to avoid overwhelming printer
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log(`Print queue processing complete: ${result.succeeded} succeeded, ${result.failed} failed`);
    return result;

  } catch (error) {
    console.error('Fatal error in print queue processor:', error);
    throw error;
  }
}

/**
 * Trigger immediate printing for a newly added job
 * This is called right after inserting into the queue for faster response
 * If it fails, the job stays in queue for the print-worker to retry
 */
export async function triggerImmediatePrint(orderId: string): Promise<{ success: boolean; message: string }> {
  const printerHost = process.env.PRINTER_IP_ADDRESS;
  const printerPort = parseInt(process.env.PRINTER_PORT || '9100');

  if (!printerHost) {
    console.log('[IMMEDIATE PRINT] Printer not configured, job will be processed by worker');
    return { success: false, message: 'Printer not configured' };
  }

  const supabase = createServiceClient();

  try {
    // Fetch the print job for this order
    const { data: job, error: fetchError } = await supabase
      .from('print_queue')
      .select('*')
      .eq('order_id', orderId)
      .eq('status', 'pending')
      .single();

    if (fetchError || !job) {
      console.log('[IMMEDIATE PRINT] No pending job found for order:', orderId);
      return { success: false, message: 'No pending job found' };
    }

    console.log(`[IMMEDIATE PRINT] Processing order ${orderId} immediately`);

    // Generate ESC/POS commands
    const escposData = generateESCPOS(job.print_data);
    console.log(`[IMMEDIATE PRINT] Generated ${escposData.length} bytes`);

    // Send to printer
    const printResult = await printToNetwork(escposData, {
      host: printerHost,
      port: printerPort,
      timeout: 5000,
    });

    if (printResult.success) {
      // Mark as printed
      await supabase
        .from('print_queue')
        .update({
          status: 'printed',
          processed_at: new Date().toISOString(),
          attempts: 1,
        })
        .eq('id', job.id);

      // Update order print status
      await supabase
        .from('orders')
        .update({ print_status: 'printed' })
        .eq('id', orderId);

      console.log(`[IMMEDIATE PRINT] ✓ Order ${orderId} printed successfully`);
      return { success: true, message: 'Printed successfully' };
    } else {
      // Increment attempt count but keep as pending for retry
      await supabase
        .from('print_queue')
        .update({
          attempts: 1,
          error_message: printResult.message,
        })
        .eq('id', job.id);

      console.log(`[IMMEDIATE PRINT] ✗ Order ${orderId} print failed: ${printResult.message}`);
      return { success: false, message: printResult.message };
    }
  } catch (error) {
    console.error('[IMMEDIATE PRINT] Error:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Process a single print job by ID
 */
export async function processPrintJob(
  jobId: string,
  config: ProcessorConfig
): Promise<boolean> {
  const supabase = createServiceClient();

  try {
    // Fetch the specific job
    const { data: job, error: fetchError } = await supabase
      .from('print_queue')
      .select('*')
      .eq('id', jobId)
      .single();

    if (fetchError || !job) {
      console.error('Error fetching print job:', fetchError);
      return false;
    }

    const printJob = job as PrintJob;
    
    // Generate ESC/POS commands
    const escposData = generateESCPOS(printJob.print_data);
    
    // Send to printer
    const printResult = await printToNetwork(escposData, config.printer);
    
    if (printResult.success) {
      // Mark as printed
      await supabase
        .from('print_queue')
        .update({
          status: 'printed',
          processed_at: new Date().toISOString(),
          attempts: printJob.attempts + 1,
        })
        .eq('id', jobId);

      // Update order
      await supabase
        .from('orders')
        .update({ print_status: 'printed' })
        .eq('id', printJob.order_id);

      return true;
    } else {
      // Mark as failed
      await supabase
        .from('print_queue')
        .update({
          status: 'failed',
          error_message: printResult.message,
          attempts: printJob.attempts + 1,
        })
        .eq('id', jobId);

      return false;
    }
  } catch (error) {
    console.error('Error processing print job:', error);
    return false;
  }
}
