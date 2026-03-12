// Cron endpoint: Manage batch lifecycle transitions
// Call every 1-5 minutes via external cron service or Vercel Cron
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import {
  getOrCreateTodayBatches,
  getTodayDateString,
  type Batch,
  type BatchStatus,
} from '@/lib/batch/batch-service';

// Restaurant timezone (Nigeria)
const RESTAURANT_TIMEZONE = 'Africa/Lagos';

function getNowInNigeria(): Date {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: RESTAURANT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  };
  const formatter = new Intl.DateTimeFormat('en-CA', options);
  const parts = formatter.formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)?.value || '0';

  return new Date(
    parseInt(get('year')),
    parseInt(get('month')) - 1,
    parseInt(get('day')),
    parseInt(get('hour')),
    parseInt(get('minute')),
    parseInt(get('second'))
  );
}

function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();
    const now = getNowInNigeria();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const today = getTodayDateString();

    // Step 1: Ensure today's batches exist
    const batches = await getOrCreateTodayBatches();
    const transitions: { batchId: string; from: string; to: string; windowName: string }[] = [];

    // Step 2: Check each batch for needed transitions
    for (const batch of batches) {
      const dw = batch.delivery_window;
      if (!dw) continue;

      const cutoffMin = timeToMinutes(dw.cutoff_time);
      const deliveryStartMin = timeToMinutes(dw.delivery_start);
      const deliveryEndMin = timeToMinutes(dw.delivery_end);

      let newStatus: BatchStatus | null = null;

      if (batch.status === 'accepting' && currentMinutes >= cutoffMin) {
        newStatus = 'cutoff';
      } else if (batch.status === 'cutoff' && currentMinutes >= deliveryStartMin - 15) {
        newStatus = 'preparing';
      } else if (batch.status === 'preparing' && currentMinutes >= deliveryStartMin) {
        newStatus = 'dispatching';
      } else if (batch.status === 'dispatching' && currentMinutes >= deliveryEndMin + 30) {
        newStatus = 'completed';
      }

      if (newStatus) {
        const { error } = await supabase
          .from('batches')
          .update({ status: newStatus })
          .eq('id', batch.id);

        if (!error) {
          transitions.push({
            batchId: batch.id,
            from: batch.status,
            to: newStatus,
            windowName: dw.name,
          });
          console.log(`📦 Batch "${dw.name}" transitioned: ${batch.status} → ${newStatus}`);
        } else {
          console.error(`Error transitioning batch ${batch.id}:`, error);
        }
      }
    }

    // Step 3: Also update the legacy is_open flag for backward compat
    const anyAccepting = batches.some(b => {
      if (b.status !== 'accepting' || !b.delivery_window) return false;
      const cutoff = timeToMinutes(b.delivery_window.cutoff_time);
      return currentMinutes < cutoff;
    });

    // Check if transitions changed accepting state
    const wasAccepting = batches.some(b => b.status === 'accepting');
    const isNowAccepting = anyAccepting && !transitions.some(t => t.from === 'accepting');

    if (wasAccepting !== isNowAccepting || transitions.length > 0) {
      // Update the legacy order_settings.is_open to match batch state
      const { data: currentSettings } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'order_settings')
        .single();

      if (currentSettings) {
        const settings = currentSettings.value as Record<string, unknown>;
        const shouldBeOpen = anyAccepting || transitions.some(t => t.to === 'accepting');

        if (settings.is_open !== shouldBeOpen) {
          await supabase
            .from('settings')
            .update({ value: { ...settings, is_open: shouldBeOpen } })
            .eq('key', 'order_settings');
        }
      }
    }

    return NextResponse.json({
      success: true,
      date: today,
      batches_checked: batches.length,
      transitions,
      any_accepting: anyAccepting,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('Error in batch-lifecycle cron:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
