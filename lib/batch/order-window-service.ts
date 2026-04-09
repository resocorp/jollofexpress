// Order Window Service — public-facing batch status for frontend consumption
import {
  getOrCreateTodayBatches,
  getNextAvailableBatch,
  getActiveDeliveryWindows,
  formatTimeDisplay,
  formatDeliveryWindow,
  getTodayDateString,
  getTomorrowDateString,
  type Batch,
  type DeliveryWindow,
} from './batch-service';
import {
  getRestaurantOpenCloseStatus,
  type RestaurantOpenCloseStatus,
  type NextOpenInfo,
} from '../operating-hours';

// Restaurant timezone (Nigeria)
const RESTAURANT_TIMEZONE = 'Africa/Lagos';

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

export interface BatchStatusInfo {
  id: string;
  deliveryWindowId: string | null;
  windowName: string;
  deliveryDate: string;
  deliveryWindow: string; // "4:00 PM – 6:00 PM"
  status: string;
  ordersPlaced: number;
  maxCapacity: number;
  capacityPercent: number;
  cutoffTime: string; // "2:00 PM"
  deliveryStart: string; // "4:00 PM"
  deliveryEnd: string; // "6:00 PM"
  secondsUntilCutoff: number;
}

export interface OrderWindowStatusResponse {
  // The most relevant batch for a new order
  nextBatch: BatchStatusInfo | null;
  // All of today's batches
  allTodayBatches: BatchStatusInfo[];
  // Customer-facing summary
  isAccepting: boolean;
  isPreorder: boolean;
  deliveryDate: string; // "Today" | "Tomorrow (Thu)" | "2026-03-16"
  deliveryDateRaw: string; // "2026-03-12"
  deliveryWindow: string; // "4:00 PM – 6:00 PM"
  secondsUntilCutoff: number;
  capacityPercent: number;
  // Human-readable message
  message: string;
  // For backward compat with existing useRestaurantStatus()
  is_open: boolean;
  // Restaurant open/close state
  restaurantClosed: boolean;
  closedReason: string;
  nextOpenInfo: NextOpenInfo | null;
}

/**
 * Format a date to customer-facing display
 */
function formatDeliveryDate(dateStr: string): string {
  const today = getTodayDateString();
  const tomorrow = getTomorrowDateString();

  if (dateStr === today) return 'Today';

  if (dateStr === tomorrow) {
    const d = new Date(dateStr + 'T00:00:00');
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    return `Tomorrow (${dayName})`;
  }

  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * Convert a Batch to BatchStatusInfo for API response
 */
function batchToStatusInfo(batch: Batch): BatchStatusInfo {
  const dw = batch.delivery_window;
  const currentMinutes = getCurrentTimeMinutes();
  const cutoffMinutes = dw ? timeToMinutes(dw.cutoff_time) : 0;
  const secondsUntilCutoff = Math.max(0, (cutoffMinutes - currentMinutes) * 60);
  const capacityPercent = batch.max_capacity > 0
    ? Math.round((batch.total_orders / batch.max_capacity) * 100)
    : 0;

  return {
    id: batch.id,
    deliveryWindowId: batch.delivery_window_id,
    windowName: dw?.name || 'Batch',
    deliveryDate: batch.delivery_date,
    deliveryWindow: dw
      ? formatDeliveryWindow(dw.delivery_start, dw.delivery_end)
      : '',
    status: batch.status,
    ordersPlaced: batch.total_orders,
    maxCapacity: batch.max_capacity,
    capacityPercent,
    cutoffTime: dw ? formatTimeDisplay(dw.cutoff_time) : '',
    deliveryStart: dw ? formatTimeDisplay(dw.delivery_start) : '',
    deliveryEnd: dw ? formatTimeDisplay(dw.delivery_end) : '',
    secondsUntilCutoff,
  };
}

/**
 * Build a friendly closed message based on restaurant status
 */
function buildClosedMessage(status: RestaurantOpenCloseStatus): string {
  // Within hours but manually closed
  if (status.withinHours && !status.manuallyOpen) {
    return "We're taking a short break, back soon! 🍖";
  }

  const next = status.nextOpenInfo;

  if (next?.isToday) {
    return `We open at ${next.time} today — see you soon! 🔥`;
  }

  if (next?.isTomorrow) {
    return `We're done for today! 🌙 Back tomorrow at ${next.time}`;
  }

  if (next) {
    return `We're closed today 😴 We'll be back on ${next.dayName} at ${next.time}!`;
  }

  return "We're closed right now. Check back soon! 🍖";
}

/**
 * Build a human-readable status message
 */
function buildStatusMessage(
  isAccepting: boolean,
  isPreorder: boolean,
  deliveryDate: string,
  deliveryWindow: string,
  secondsUntilCutoff: number,
  nextBatch: BatchStatusInfo | null
): string {
  if (!nextBatch) {
    return 'No delivery windows available. Please check back later.';
  }

  if (isAccepting && !isPreorder) {
    const hours = Math.floor(secondsUntilCutoff / 3600);
    const minutes = Math.floor((secondsUntilCutoff % 3600) / 60);
    const countdownStr = hours > 0
      ? `${hours}h ${minutes}m`
      : `${minutes}m`;
    return `Ordering open · Delivery today ${deliveryWindow} · Order closes in ${countdownStr}`;
  }

  if (isPreorder) {
    const dateDisplay = formatDeliveryDate(nextBatch.deliveryDate);
    return `Pre-ordering for ${dateDisplay} · Delivery ${deliveryWindow}`;
  }

  // All batches in cooking/dispatching/completed
  return `Today's batches are in progress · Next orders open tomorrow`;
}

/**
 * Get the full order window status for the public API
 * This is the main function consumed by the frontend
 */
export async function getOrderWindowStatus(): Promise<OrderWindowStatusResponse> {
  const restaurantStatus = await getRestaurantOpenCloseStatus();
  if (!restaurantStatus.effectivelyOpen) {
    // Still fetch next available batch so frontend can show upcoming delivery info
    const { batch: upcomingBatch, deliveryDate: upcomingDate, deliveryWindow: upcomingWindow } =
      await getNextAvailableBatch();
    const upcomingBatchInfo = upcomingBatch ? batchToStatusInfo(upcomingBatch) : null;

    return {
      nextBatch: upcomingBatchInfo,
      allTodayBatches: [],
      isAccepting: false,
      isPreorder: false,
      deliveryDate: upcomingDate ? formatDeliveryDate(upcomingDate) : '',
      deliveryDateRaw: upcomingDate,
      deliveryWindow: upcomingWindow,
      secondsUntilCutoff: 0,
      capacityPercent: 0,
      message: buildClosedMessage(restaurantStatus),
      is_open: false,
      restaurantClosed: true,
      closedReason: restaurantStatus.closedReason,
      nextOpenInfo: restaurantStatus.nextOpenInfo,
    };
  }

  const todayBatches = await getOrCreateTodayBatches();
  const { batch: nextBatch, isPreorder, deliveryDate, deliveryWindow } =
    await getNextAvailableBatch();

  // Build today's batch info array
  const allTodayBatches = todayBatches.map(batchToStatusInfo);

  // Build next batch info
  let nextBatchInfo: BatchStatusInfo | null = null;
  let secondsUntilCutoff = 0;
  let capacityPercent = 0;

  if (nextBatch) {
    nextBatchInfo = batchToStatusInfo(nextBatch);
    secondsUntilCutoff = nextBatchInfo.secondsUntilCutoff;
    capacityPercent = nextBatchInfo.capacityPercent;
  }

  const isAccepting = nextBatch?.status === 'accepting' && !isPreorder;
  const displayDate = deliveryDate ? formatDeliveryDate(deliveryDate) : '';

  const message = buildStatusMessage(
    isAccepting,
    isPreorder,
    displayDate,
    deliveryWindow,
    secondsUntilCutoff,
    nextBatchInfo
  );

  return {
    nextBatch: nextBatchInfo,
    allTodayBatches,
    isAccepting,
    isPreorder,
    deliveryDate: displayDate,
    deliveryDateRaw: deliveryDate,
    deliveryWindow,
    secondsUntilCutoff,
    capacityPercent,
    message,
    // Backward compat: "open" means there's an accepting batch
    is_open: isAccepting,
    restaurantClosed: false,
    closedReason: '',
    nextOpenInfo: null,
  };
}

/**
 * Get customer-facing delivery info for a new order
 * Used by cart/checkout to show what window the order will be assigned to
 */
export async function getCustomerFacingDeliveryInfo(): Promise<{
  deliveryDate: string; // "Today" | "Tomorrow (Thu)"
  deliveryDateRaw: string; // "2026-03-12"
  deliveryWindow: string; // "4:00 PM – 6:00 PM"
  isToday: boolean;
  isPreorder: boolean;
  batchId: string | null;
  secondsUntilCutoff: number;
  capacityPercent: number;
}> {
  const { batch, isPreorder, deliveryDate, deliveryWindow } = await getNextAvailableBatch();

  const today = getTodayDateString();
  const isToday = deliveryDate === today;

  let secondsUntilCutoff = 0;
  let capacityPercent = 0;

  if (batch?.delivery_window) {
    const currentMinutes = getCurrentTimeMinutes();
    const cutoffMinutes = timeToMinutes(batch.delivery_window.cutoff_time);
    secondsUntilCutoff = Math.max(0, (cutoffMinutes - currentMinutes) * 60);
    capacityPercent = batch.max_capacity > 0
      ? Math.round((batch.total_orders / batch.max_capacity) * 100)
      : 0;
  }

  return {
    deliveryDate: deliveryDate ? formatDeliveryDate(deliveryDate) : '',
    deliveryDateRaw: deliveryDate,
    deliveryWindow,
    isToday,
    isPreorder,
    batchId: batch?.id || null,
    secondsUntilCutoff,
    capacityPercent,
  };
}
