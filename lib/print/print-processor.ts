/**
 * Print Queue Processor
 * Processes pending print jobs from the database and sends to network printer
 *
 * Concurrency model:
 *   - All consumers (worker poll, immediate-print on payment confirm) claim
 *     rows atomically via the claim_print_jobs / claim_print_job_for_order
 *     RPCs (defined in print_queue_dedup_and_audit.sql). The RPC stamps
 *     claimed_at and increments attempts inside an UPDATE … WHERE id =
 *     (SELECT … FOR UPDATE SKIP LOCKED) so two consumers can never claim
 *     the same row.
 *   - Stuck-job recovery is implicit: a row whose claimed_at is older than
 *     2 minutes becomes claimable again, so a crashed worker can never
 *     strand a row.
 */

import { createServiceClient } from '@/lib/supabase/service';
import { generateESCPOS } from './escpos-generator';
import { printToNetwork, type PrinterConfig } from './network-printer';
import { logPrintAudit, type PrintAuditSource } from './audit-log';
import type { ReceiptData } from './format-receipt';

export interface PrintJob {
  id: string;
  order_id: string;
  print_data: ReceiptData;
  status: 'pending' | 'printed' | 'failed';
  attempts: number;
  error_message?: string;
  created_at: string;
  claimed_at?: string | null;
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
    // Atomically claim a batch. Each returned row has had claimed_at stamped
    // and attempts incremented; concurrent callers cannot see the same row.
    const { data: jobs, error: fetchError } = await supabase.rpc('claim_print_jobs', {
      p_batch_size: batchSize,
      p_max_attempts: maxAttempts,
    });

    if (fetchError) {
      console.error('Error claiming print jobs:', fetchError);
      throw fetchError;
    }

    if (!jobs || jobs.length === 0) {
      console.log('No pending print jobs');
      return result;
    }

    console.log(`Claimed ${jobs.length} print job(s)`);

    for (const job of jobs as PrintJob[]) {
      result.processed++;
      await runClaimedJob(supabase, job, config, 'worker_poll', result);
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
 * Trigger immediate printing for a newly added job.
 * Called fire-and-forget right after the queue insert so customers see
 * "printed" feedback fast. Race-safe: claims via RPC, so the worker poll
 * can't race the same row.
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
    const { data: claimed, error: claimError } = await supabase.rpc('claim_print_job_for_order', {
      p_order_id: orderId,
    });

    if (claimError) {
      console.error('[IMMEDIATE PRINT] Claim error:', claimError);
      return { success: false, message: claimError.message };
    }

    const job = (claimed && claimed.length > 0 ? claimed[0] : null) as PrintJob | null;

    if (!job) {
      // Either there's no pending row, or another path (worker poll) already
      // claimed it. Either way: nothing to do.
      console.log(`[IMMEDIATE PRINT] No claimable job for order ${orderId}`);
      await logPrintAudit({
        event: 'claim_lost',
        source: 'immediate_print',
        orderId,
      }, supabase);
      return { success: false, message: 'No claimable job' };
    }

    console.log(`[IMMEDIATE PRINT] Claimed job ${job.id} for order ${orderId}`);

    const result: ProcessResult = { processed: 0, succeeded: 0, failed: 0, errors: [] };
    await runClaimedJob(
      supabase,
      job,
      {
        printer: { host: printerHost, port: printerPort, timeout: 5000 },
        maxAttempts: 3,
      },
      'immediate_print',
      result,
    );

    if (result.succeeded > 0) {
      return { success: true, message: 'Printed successfully' };
    }
    return {
      success: false,
      message: result.errors[0]?.error ?? 'Print failed',
    };
  } catch (error) {
    console.error('[IMMEDIATE PRINT] Error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process a single print job by ID (used by manual reprint path).
 * The kitchen Reprint button creates a fresh row and then calls this
 * directly; no claim race because the row is brand-new.
 */
export async function processPrintJob(
  jobId: string,
  config: ProcessorConfig
): Promise<boolean> {
  const supabase = createServiceClient();

  try {
    const { data: job, error: fetchError } = await supabase
      .from('print_queue')
      .select('*')
      .eq('id', jobId)
      .single();

    if (fetchError || !job) {
      console.error('Error fetching print job:', fetchError);
      return false;
    }

    const result: ProcessResult = { processed: 0, succeeded: 0, failed: 0, errors: [] };
    await runClaimedJob(supabase, job as PrintJob, config, 'kitchen_reprint', result);
    return result.succeeded > 0;
  } catch (error) {
    console.error('Error processing print job:', error);
    return false;
  }
}

/**
 * Shared print + status-update flow for a row that has already been
 * claimed (or is brand-new in the case of a manual reprint).
 */
async function runClaimedJob(
  supabase: ReturnType<typeof createServiceClient>,
  job: PrintJob,
  config: ProcessorConfig,
  source: PrintAuditSource,
  result: ProcessResult,
): Promise<void> {
  const maxAttempts = config.maxAttempts || 3;

  await logPrintAudit({
    event: 'claim_won',
    source,
    orderId: job.order_id,
    printJobId: job.id,
    details: { attempts: job.attempts },
  }, supabase);

  try {
    console.log(`Processing print job ${job.id} (order: ${job.print_data?.orderNumber})`);

    const escposData = generateESCPOS(job.print_data);
    console.log(`  Generated ${escposData.length} bytes`);

    console.log(`  Sending to printer ${config.printer.host}:${config.printer.port}...`);
    const printResult = await printToNetwork(escposData, config.printer);
    console.log(`  Print result:`, printResult);

    await logPrintAudit({
      event: 'tcp_sent',
      source,
      orderId: job.order_id,
      printJobId: job.id,
      details: { success: printResult.success, message: printResult.message },
    }, supabase);

    if (printResult.success) {
      const { error: updateError } = await supabase
        .from('print_queue')
        .update({
          status: 'printed',
          processed_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      if (updateError) {
        console.error(`Error updating job ${job.id}:`, updateError);
      } else {
        console.log(`✓ Print job ${job.id} completed successfully`);
        result.succeeded++;
      }

      await supabase
        .from('orders')
        .update({ print_status: 'printed' })
        .eq('id', job.order_id);

      await logPrintAudit({
        event: 'marked_printed',
        source,
        orderId: job.order_id,
        printJobId: job.id,
      }, supabase);
    } else {
      // Print failed. Release the claim so a future poll can retry. attempts
      // was already incremented inside the claim RPC, so retry budget is
      // enforced naturally.
      const shouldMarkFailed = job.attempts >= maxAttempts;
      const status = shouldMarkFailed ? 'failed' : 'pending';

      const { error: updateError } = await supabase
        .from('print_queue')
        .update({
          status,
          claimed_at: null,
          error_message: printResult.message,
        })
        .eq('id', job.id);

      if (updateError) {
        console.error(`Error updating job ${job.id}:`, updateError);
      }

      if (shouldMarkFailed) {
        console.error(`✗ Print job ${job.id} failed permanently (${job.attempts} attempts)`);
        result.failed++;
        result.errors.push({
          jobId: job.id,
          error: printResult.message,
        });

        await supabase
          .from('orders')
          .update({ print_status: 'failed', print_attempts: job.attempts })
          .eq('id', job.order_id);

        await logPrintAudit({
          event: 'marked_failed',
          source,
          orderId: job.order_id,
          printJobId: job.id,
          details: { error: printResult.message, attempts: job.attempts },
        }, supabase);
      } else {
        console.warn(`⚠ Print job ${job.id} failed, will retry (attempt ${job.attempts}/${maxAttempts})`);
      }
    }
  } catch (error) {
    console.error(`Error processing job ${job.id}:`, error);
    result.errors.push({
      jobId: job.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    await supabase
      .from('print_queue')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Processing error',
        claimed_at: null,
      })
      .eq('id', job.id);

    await logPrintAudit({
      event: 'marked_failed',
      source,
      orderId: job.order_id,
      printJobId: job.id,
      details: { error: error instanceof Error ? error.message : 'unknown' },
    }, supabase);

    result.failed++;
  }
}
