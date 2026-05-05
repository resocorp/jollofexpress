/**
 * Print audit log
 *
 * Append-only timeline of every print_queue lifecycle event. Lets us answer
 * "why did this order print twice?" with a single SQL query against the
 * order_id, instead of grepping logs from three different processes.
 *
 * Failures inside this helper are swallowed — auditing must never block the
 * print path or surface errors to the customer flow.
 */

import { createServiceClient } from '@/lib/supabase/service';
import type { SupabaseClient } from '@supabase/supabase-js';

export type PrintAuditEvent =
  | 'queued'
  | 'duplicate_blocked'
  | 'claim_won'
  | 'claim_lost'
  | 'tcp_sent'
  | 'marked_printed'
  | 'marked_failed'
  | 'recovered';

export type PrintAuditSource =
  | 'webhook'
  | 'verify_payment'
  | 'immediate_print'
  | 'worker_poll'
  | 'kitchen_reprint'
  | 'kitchen_test'
  | 'recovery';

export interface PrintAuditEntry {
  event: PrintAuditEvent;
  source: PrintAuditSource;
  orderId?: string | null;
  printJobId?: string | null;
  details?: Record<string, unknown>;
}

export async function logPrintAudit(
  entry: PrintAuditEntry,
  supabase?: SupabaseClient,
): Promise<void> {
  try {
    const client = supabase ?? createServiceClient();
    await client.from('print_audit_log').insert({
      event: entry.event,
      source: entry.source,
      order_id: entry.orderId ?? null,
      print_job_id: entry.printJobId ?? null,
      details: entry.details ?? null,
    });
  } catch (err) {
    console.error('[print-audit] failed to write audit row:', err);
  }
}
