import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfMonth,
  subDays,
} from 'date-fns';

/**
 * Shared date-range helpers for the admin analytics & expenses views.
 *
 * A `DateRange` is a pair of **inclusive** ISO calendar dates (`YYYY-MM-DD`).
 * The frontend picker owns a `DateRange` and passes `from`/`to` to the API
 * routes, which filter the relevant date column for that window.
 */
export type DateRange = { from: string; to: string };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const iso = (d: Date): string => format(d, 'yyyy-MM-dd');

export interface RangePreset {
  /** Stable key, also used to highlight the active preset. */
  key: string;
  label: string;
  resolve: () => DateRange;
}

/** Quick presets shown alongside the custom From/To fields. */
export const RANGE_PRESETS: RangePreset[] = [
  {
    key: '7',
    label: 'Last 7 days',
    resolve: () => ({ from: iso(subDays(new Date(), 6)), to: iso(new Date()) }),
  },
  {
    key: '30',
    label: 'Last 30 days',
    resolve: () => ({ from: iso(subDays(new Date(), 29)), to: iso(new Date()) }),
  },
  {
    key: '90',
    label: 'Last 90 days',
    resolve: () => ({ from: iso(subDays(new Date(), 89)), to: iso(new Date()) }),
  },
  {
    key: 'month',
    label: 'This month',
    resolve: () => ({ from: iso(startOfMonth(new Date())), to: iso(new Date()) }),
  },
];

export const DEFAULT_RANGE_PRESET = RANGE_PRESETS[1]; // Last 30 days

/** Resolve a preset by its number of days (used for per-view defaults). */
export function presetForDays(days: number): RangePreset {
  return RANGE_PRESETS.find((p) => p.key === String(days)) ?? DEFAULT_RANGE_PRESET;
}

/** The default range shown when a view first loads (Last 30 days). */
export function defaultRange(): DateRange {
  return DEFAULT_RANGE_PRESET.resolve();
}

/** Number of calendar days in the inclusive `[from, to]` window. */
export function daysInRange(from: string, to: string): number {
  return differenceInCalendarDays(parseISO(to), parseISO(from)) + 1;
}

/**
 * Exclusive upper bound (`to` + 1 day) for filtering **timestamptz** columns
 * (`created_at`, `completed_at`) with `.lt()`, so the entire `to` day is
 * included. DATE columns (`purchase_date`) filter inclusively with `.lte(to)`.
 */
export function exclusiveEnd(to: string): string {
  return format(addDays(parseISO(to), 1), 'yyyy-MM-dd');
}

/** Return the preset key whose resolved range matches, or null (custom range). */
export function matchPreset(range: DateRange): string | null {
  for (const p of RANGE_PRESETS) {
    const r = p.resolve();
    if (r.from === range.from && r.to === range.to) return p.key;
  }
  return null;
}

export interface ResolvedWindow {
  /** Inclusive start date, `YYYY-MM-DD`. */
  from: string;
  /** Inclusive end date, `YYYY-MM-DD`. */
  to: string;
  /** Exclusive upper bound for `.lt()` on timestamptz columns. */
  endExclusive: string;
  /** Number of calendar days in the window. */
  periodDays: number;
}

/**
 * Resolve the query window for an analytics API route.
 *
 * Prefers explicit `from`/`to` query params (validated `YYYY-MM-DD`, swapped if
 * reversed). Falls back to the legacy rolling `period` (day count ending today)
 * for backward compatibility.
 */
export function resolveAnalyticsWindow(
  searchParams: URLSearchParams,
  fallbackPeriodDays = 30,
): ResolvedWindow {
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');

  if (fromParam && toParam && ISO_DATE.test(fromParam) && ISO_DATE.test(toParam)) {
    const from = fromParam <= toParam ? fromParam : toParam;
    const to = fromParam <= toParam ? toParam : fromParam;
    return { from, to, endExclusive: exclusiveEnd(to), periodDays: daysInRange(from, to) };
  }

  const parsed = parseInt(searchParams.get('period') || String(fallbackPeriodDays), 10);
  const periodDays = Math.max(1, Number.isFinite(parsed) ? parsed : fallbackPeriodDays);
  const to = iso(new Date());
  const from = iso(subDays(new Date(), periodDays - 1));
  return { from, to, endExclusive: exclusiveEnd(to), periodDays };
}
