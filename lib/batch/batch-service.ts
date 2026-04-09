// Batch delivery management service
import { createServiceClient } from '@/lib/supabase/service';
import { getOperatingHours, type DayOfWeek } from '@/lib/operating-hours';

// Restaurant timezone (Nigeria)
const RESTAURANT_TIMEZONE = 'Africa/Lagos';

export interface DeliveryWindow {
  id: string;
  name: string;
  order_open_time: string; // HH:MM
  cutoff_time: string;
  delivery_start: string;
  delivery_end: string;
  max_capacity: number;
  is_active: boolean;
  display_order: number;
  days_of_week: number[] | null; // null=every day, [1,2,3,4,5]=Mon-Fri
  created_at: string;
  updated_at: string;
}

export interface Batch {
  id: string;
  delivery_window_id: string | null;
  delivery_date: string; // YYYY-MM-DD
  status: BatchStatus;
  total_orders: number;
  max_capacity: number;
  override_reason: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  delivery_window?: DeliveryWindow;
}

export type BatchStatus = 'accepting' | 'cutoff' | 'preparing' | 'dispatching' | 'completed' | 'cancelled';

const BATCH_STATUS_ORDER: BatchStatus[] = ['accepting', 'cutoff', 'preparing', 'dispatching', 'completed'];

/**
 * Get current time in Nigeria timezone
 */
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

/**
 * Get today's date string in YYYY-MM-DD format (Nigeria timezone)
 */
export function getTodayDateString(): string {
  const now = getNowInNigeria();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get tomorrow's date string in YYYY-MM-DD format (Nigeria timezone)
 */
export function getTomorrowDateString(): string {
  const now = getNowInNigeria();
  now.setDate(now.getDate() + 1);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get current day of week (0=Sunday, 1=Monday, ..., 6=Saturday) in Nigeria timezone
 */
function getCurrentDayOfWeek(): number {
  return getNowInNigeria().getDay();
}

/**
 * Convert HH:MM time string to minutes since midnight
 */
function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Get current time in minutes since midnight (Nigeria timezone)
 */
function getCurrentTimeMinutes(): number {
  const now = getNowInNigeria();
  return now.getHours() * 60 + now.getMinutes();
}

/**
 * Format time from HH:MM to human-readable (e.g., "4:00 PM")
 */
export function formatTimeDisplay(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
}

/**
 * Format a delivery window as "X:XX PM – Y:YY PM"
 */
export function formatDeliveryWindow(deliveryStart: string, deliveryEnd: string): string {
  return `${formatTimeDisplay(deliveryStart)} – ${formatTimeDisplay(deliveryEnd)}`;
}

/**
 * Check if a delivery window is active today based on days_of_week
 */
function isWindowActiveToday(window: DeliveryWindow): boolean {
  if (!window.is_active) return false;
  if (!window.days_of_week) return true; // null = every day
  return window.days_of_week.includes(getCurrentDayOfWeek());
}

/**
 * Get all active delivery window templates
 */
export async function getActiveDeliveryWindows(): Promise<DeliveryWindow[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('delivery_windows')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching delivery windows:', error);
    return [];
  }

  return data || [];
}

/**
 * Get or create today's batches from active delivery windows (idempotent)
 */
export async function getOrCreateTodayBatches(): Promise<Batch[]> {
  const supabase = createServiceClient();
  const today = getTodayDateString();

  // Get existing batches for today, ordered by delivery window's display_order
  const { data: existingBatches, error: fetchError } = await supabase
    .from('batches')
    .select('*, delivery_window:delivery_windows(*)')
    .eq('delivery_date', today)
    .order('created_at', { ascending: true });

  // Sort by delivery window display_order so earliest window comes first
  if (existingBatches) {
    existingBatches.sort((a: any, b: any) => {
      const aOrder = a.delivery_window?.display_order ?? 999;
      const bOrder = b.delivery_window?.display_order ?? 999;
      return aOrder - bOrder;
    });
  }

  if (fetchError) {
    console.error('Error fetching today batches:', fetchError);
    return [];
  }

  const existingList = (existingBatches || []) as Batch[];

  // Get active windows for today and create batches for any that are missing
  const windows = await getActiveDeliveryWindows();
  const todayWindows = windows.filter(isWindowActiveToday);

  const existingWindowIds = new Set(existingList.map(b => b.delivery_window_id));
  const missingWindows = todayWindows.filter(w => !existingWindowIds.has(w.id));

  if (missingWindows.length === 0) {
    return existingList;
  }

  const batchInserts = missingWindows.map(w => ({
    delivery_window_id: w.id,
    delivery_date: today,
    status: 'accepting' as const,
    total_orders: 0,
    max_capacity: w.max_capacity,
  }));

  const { data: newBatches, error: insertError } = await supabase
    .from('batches')
    .insert(batchInserts)
    .select('*, delivery_window:delivery_windows(*)');

  if (insertError) {
    console.error('Error creating today batches:', insertError);
    // Might be a race condition — try fetching again
    const { data: retryBatches } = await supabase
      .from('batches')
      .select('*, delivery_window:delivery_windows(*)')
      .eq('delivery_date', today)
      .order('created_at', { ascending: true });
    return (retryBatches || []) as Batch[];
  }

  return [...existingList, ...((newBatches || []) as Batch[])];
}

/**
 * Get the next available batch that is still ACCEPTING orders with capacity.
 * If none today, returns tomorrow's first batch.
 */
export async function getNextAvailableBatch(): Promise<{
  batch: Batch | null;
  isPreorder: boolean;
  deliveryDate: string;
  deliveryWindow: string;
}> {
  const currentMinutes = getCurrentTimeMinutes();
  const todayBatches = await getOrCreateTodayBatches();

  // Find first batch that is accepting, has capacity, and belongs to an active delivery window
  for (const batch of todayBatches) {
    if (
      batch.status === 'accepting' &&
      batch.total_orders < batch.max_capacity &&
      batch.delivery_window &&
      batch.delivery_window.is_active !== false
    ) {
      const cutoffMinutes = timeToMinutes(batch.delivery_window.cutoff_time);
      // Only if we haven't passed the cutoff (cron may not have transitioned yet)
      if (currentMinutes < cutoffMinutes) {
        return {
          batch,
          isPreorder: false,
          deliveryDate: batch.delivery_date,
          deliveryWindow: formatDeliveryWindow(
            batch.delivery_window.delivery_start,
            batch.delivery_window.delivery_end
          ),
        };
      }
    }
  }

  // No accepting batch today — find the next operating day (up to 7 days ahead)
  const supabase = createServiceClient();
  const windows = await getActiveDeliveryWindows();
  const operatingHours = await getOperatingHours();
  const dayKeys: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  for (let daysAhead = 1; daysAhead <= 7; daysAhead++) {
    const futureDate = getNowInNigeria();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    const futureDow = futureDate.getDay();

    // Skip days the restaurant is closed per operating hours
    if (operatingHours) {
      const dayHours = operatingHours[dayKeys[futureDow]];
      if (dayHours?.closed) continue;
    }

    const y = futureDate.getFullYear();
    const m = String(futureDate.getMonth() + 1).padStart(2, '0');
    const d = String(futureDate.getDate()).padStart(2, '0');
    const futureDateStr = `${y}-${m}-${d}`;

    // Filter windows active on this day of week
    const dayWindows = windows.filter(w => {
      if (!w.days_of_week) return true;
      return w.days_of_week.includes(futureDow);
    });

    if (dayWindows.length === 0) continue;

    // Check for existing batches on this date
    const { data: existingBatches } = await supabase
      .from('batches')
      .select('*, delivery_window:delivery_windows(*)')
      .eq('delivery_date', futureDateStr)
      .order('created_at', { ascending: true });

    if (existingBatches && existingBatches.length > 0) {
      // Sort by delivery window display_order so earliest window is picked first
      const sorted = [...existingBatches].sort((a: any, b: any) => {
        const aOrder = a.delivery_window?.display_order ?? 999;
        const bOrder = b.delivery_window?.display_order ?? 999;
        return aOrder - bOrder;
      });
      const firstBatch = sorted[0] as Batch;
      if (firstBatch.delivery_window) {
        return {
          batch: firstBatch,
          isPreorder: true,
          deliveryDate: futureDateStr,
          deliveryWindow: formatDeliveryWindow(
            firstBatch.delivery_window.delivery_start,
            firstBatch.delivery_window.delivery_end
          ),
        };
      }
    }

    // Create batches for this future date (sorted by display_order)
    const sortedDayWindows = [...dayWindows].sort((a, b) => a.display_order - b.display_order);
    const batchInserts = sortedDayWindows.map(w => ({
      delivery_window_id: w.id,
      delivery_date: futureDateStr,
      status: 'accepting' as const,
      total_orders: 0,
      max_capacity: w.max_capacity,
    }));

    const { data: newBatches } = await supabase
      .from('batches')
      .upsert(batchInserts, { onConflict: 'delivery_window_id,delivery_date' })
      .select('*, delivery_window:delivery_windows(*)');

    if (newBatches && newBatches.length > 0) {
      // Sort by display_order to pick the earliest window
      const sorted = [...newBatches].sort((a: any, b: any) => {
        const aOrder = a.delivery_window?.display_order ?? 999;
        const bOrder = b.delivery_window?.display_order ?? 999;
        return aOrder - bOrder;
      });
      const firstBatch = sorted[0] as Batch;
      if (firstBatch.delivery_window) {
        return {
          batch: firstBatch,
          isPreorder: true,
          deliveryDate: futureDateStr,
          deliveryWindow: formatDeliveryWindow(
            firstBatch.delivery_window.delivery_start,
            firstBatch.delivery_window.delivery_end
          ),
        };
      }
    }
  }

  return {
    batch: null,
    isPreorder: false,
    deliveryDate: '',
    deliveryWindow: '',
  };
}

/**
 * Get a batch by ID with its delivery window
 */
export async function getBatchById(batchId: string): Promise<Batch | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('batches')
    .select('*, delivery_window:delivery_windows(*)')
    .eq('id', batchId)
    .single();

  if (error || !data) return null;
  return data as Batch;
}

/**
 * Assign an order to the next available batch
 * Returns the batch info for the order response
 */
export async function assignOrderToBatch(orderId: string): Promise<{
  batchId: string;
  deliveryDate: string;
  deliveryWindow: string;
  isPreorder: boolean;
} | null> {
  const { batch, isPreorder, deliveryDate, deliveryWindow } = await getNextAvailableBatch();

  if (!batch) {
    console.error('No available batch for order:', orderId);
    return null;
  }

  const supabase = createServiceClient();

  const { error } = await supabase
    .from('orders')
    .update({
      batch_id: batch.id,
      delivery_date: deliveryDate,
      delivery_window: deliveryWindow,
    })
    .eq('id', orderId);

  if (error) {
    console.error('Error assigning order to batch:', error);
    return null;
  }

  // Note: total_orders is incremented by the DB trigger on insert,
  // but since we're updating after insert, we need to handle this manually
  // if the trigger only fires on INSERT. The trigger handles INSERT, so
  // we need to also update the batch count here since we're doing UPDATE.
  await supabase
    .from('batches')
    .update({ total_orders: batch.total_orders + 1 })
    .eq('id', batch.id);

  return {
    batchId: batch.id,
    deliveryDate,
    deliveryWindow,
    isPreorder,
  };
}

/**
 * Advance a batch to the next status (admin action)
 */
export async function advanceBatchStatus(
  batchId: string,
  newStatus?: BatchStatus
): Promise<{ success: boolean; newStatus: BatchStatus | null; error?: string }> {
  const batch = await getBatchById(batchId);
  if (!batch) {
    return { success: false, newStatus: null, error: 'Batch not found' };
  }

  let targetStatus: BatchStatus;

  if (newStatus) {
    targetStatus = newStatus;
  } else {
    // Auto-advance to next status
    const currentIdx = BATCH_STATUS_ORDER.indexOf(batch.status);
    if (currentIdx === -1 || currentIdx >= BATCH_STATUS_ORDER.length - 1) {
      return { success: false, newStatus: null, error: `Cannot advance from status: ${batch.status}` };
    }
    targetStatus = BATCH_STATUS_ORDER[currentIdx + 1];
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from('batches')
    .update({ status: targetStatus })
    .eq('id', batchId);

  if (error) {
    console.error('Error advancing batch:', error);
    return { success: false, newStatus: null, error: error.message };
  }

  return { success: true, newStatus: targetStatus };
}

/**
 * Revert a batch to the previous status (admin action)
 */
export async function revertBatchStatus(
  batchId: string
): Promise<{ success: boolean; newStatus: BatchStatus | null; error?: string }> {
  const batch = await getBatchById(batchId);
  if (!batch) {
    return { success: false, newStatus: null, error: 'Batch not found' };
  }

  const currentIdx = BATCH_STATUS_ORDER.indexOf(batch.status);
  if (currentIdx <= 0) {
    return { success: false, newStatus: null, error: `Cannot revert from status: ${batch.status}` };
  }

  const targetStatus = BATCH_STATUS_ORDER[currentIdx - 1];

  const supabase = createServiceClient();
  const { error } = await supabase
    .from('batches')
    .update({ status: targetStatus })
    .eq('id', batchId);

  if (error) {
    console.error('Error reverting batch:', error);
    return { success: false, newStatus: null, error: error.message };
  }

  return { success: true, newStatus: targetStatus };
}

/**
 * Get all batches for a specific date
 */
export async function getBatchesForDate(date: string): Promise<Batch[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('batches')
    .select('*, delivery_window:delivery_windows(*)')
    .eq('delivery_date', date)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching batches for date:', error);
    return [];
  }

  return (data || []) as Batch[];
}

/**
 * Get batches for a date range (admin calendar view)
 */
export async function getBatchesForRange(startDate: string, endDate: string): Promise<Batch[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('batches')
    .select('*, delivery_window:delivery_windows(*), orders(count)')
    .gte('delivery_date', startDate)
    .lte('delivery_date', endDate)
    .order('delivery_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching batch range:', error);
    return [];
  }

  // Attach live order count to each batch
  return (data || []).map((b: any) => ({
    ...b,
    total_orders: b.orders?.[0]?.count ?? b.total_orders,
  })) as Batch[];
}
