// Shared gating logic for "is this batch's manifest printable yet?"
// A batch is printable once either:
//   - its status has been advanced past 'accepting' (cutoff/preparing/dispatching), OR
//   - the wall-clock in the restaurant timezone has passed its window's cutoff_time.
// The second branch matters because the status transition is a manual/cron op
// in this codebase; riders shouldn't have to wait for it before printing.

const RESTAURANT_TIMEZONE = 'Africa/Lagos';

const POST_CUTOFF_STATUSES = new Set(['cutoff', 'preparing', 'dispatching']);

export function timeStringToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function getNowMinutesLagos(): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: RESTAURANT_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0', 10);
  return get('hour') * 60 + get('minute');
}

export function isPastCutoff(
  status: string,
  cutoffMinutes: number | null,
  nowMinutes: number
): boolean {
  if (POST_CUTOFF_STATUSES.has(status)) return true;
  if (status === 'accepting' && cutoffMinutes != null && nowMinutes >= cutoffMinutes) return true;
  return false;
}
