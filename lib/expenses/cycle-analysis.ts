import type {
  ExpenseAnalyticsResponse,
  ExpenseCycleItem,
  ExpenseCyclePurchase,
  ExpenseWithCategory,
} from '@/types/database';

export interface CompletedOrderRecord {
  /** ISO timestamp; we use it to bucket into cycles. */
  completed_at: string;
}

interface BuildAnalyticsInput {
  expenses: ExpenseWithCategory[];
  completedOrders: CompletedOrderRecord[];
  /** Period window in days (used as the headline "since" reference). */
  periodDays: number;
  /** "Now" — injected so callers and tests get deterministic results. */
  now?: Date;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function diffDays(later: Date, earlier: Date): number {
  return Math.max(0, Math.round((later.getTime() - earlier.getTime()) / MS_PER_DAY));
}

/**
 * Pure function that turns a list of expenses + completed-order timestamps into
 * the analytics payload returned by /api/admin/analytics/expenses.
 *
 * For each `item_name_normalized` group we walk the purchases in chronological
 * order. Between two consecutive purchases the cycle metric is
 * `count(orders.completed_at in [prev.purchase_date, curr.purchase_date))`.
 * For the latest purchase we report orders since then up to `now`.
 */
export function buildExpenseAnalytics(input: BuildAnalyticsInput): ExpenseAnalyticsResponse {
  const { expenses, completedOrders, periodDays } = input;
  const now = input.now ?? new Date();

  const orderTimestamps = completedOrders
    .map((o) => new Date(o.completed_at).getTime())
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => a - b);

  const countOrdersBetween = (startInclusive: Date, endExclusive: Date): number => {
    const start = startInclusive.getTime();
    const end = endExclusive.getTime();
    if (end <= start) return 0;
    let lo = 0;
    let hi = orderTimestamps.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (orderTimestamps[mid] < start) lo = mid + 1;
      else hi = mid;
    }
    let count = 0;
    for (let i = lo; i < orderTimestamps.length && orderTimestamps[i] < end; i++) {
      count++;
    }
    return count;
  };

  const groups = new Map<string, ExpenseWithCategory[]>();
  for (const exp of expenses) {
    const key = exp.item_name_normalized;
    const list = groups.get(key);
    if (list) list.push(exp);
    else groups.set(key, [exp]);
  }

  const cycleItems: ExpenseCycleItem[] = [];

  for (const [normalized, list] of groups) {
    list.sort((a, b) => a.purchase_date.localeCompare(b.purchase_date));

    const purchases: ExpenseCyclePurchase[] = list.map((exp, idx) => {
      const currDate = new Date(`${exp.purchase_date}T00:00:00Z`);
      let ordersSincePrev: number | null = null;
      let daysSincePrev: number | null = null;
      if (idx > 0) {
        const prev = list[idx - 1];
        const prevDate = new Date(`${prev.purchase_date}T00:00:00Z`);
        ordersSincePrev = countOrdersBetween(prevDate, currDate);
        daysSincePrev = diffDays(currDate, prevDate);
      }
      return {
        id: exp.id,
        purchase_date: exp.purchase_date,
        quantity: Number(exp.quantity),
        unit: exp.unit ?? null,
        unit_cost: Number(exp.unit_cost),
        total_cost: Number(exp.total_cost),
        vendor: exp.vendor ?? null,
        orders_since_previous: ordersSincePrev,
        days_since_previous: daysSincePrev,
      };
    });

    const totalSpend = purchases.reduce((sum, p) => sum + p.total_cost, 0);
    const cycleSamples = purchases.filter((p) => p.orders_since_previous !== null);
    const averageOrdersPerCycle = cycleSamples.length
      ? cycleSamples.reduce((s, p) => s + (p.orders_since_previous ?? 0), 0) / cycleSamples.length
      : null;
    const averageDaysPerCycle = cycleSamples.length
      ? cycleSamples.reduce((s, p) => s + (p.days_since_previous ?? 0), 0) / cycleSamples.length
      : null;

    const last = list[list.length - 1];
    const lastDate = new Date(`${last.purchase_date}T00:00:00Z`);
    const ordersSinceLastPurchase = countOrdersBetween(lastDate, now);
    const daysSinceLastPurchase = diffDays(now, lastDate);

    cycleItems.push({
      itemName: last.item_name,
      itemNameNormalized: normalized,
      category: last.category?.name ?? '—',
      totalSpend,
      purchaseCount: list.length,
      lastPurchaseDate: last.purchase_date,
      averageOrdersPerCycle,
      averageDaysPerCycle,
      ordersSinceLastPurchase,
      daysSinceLastPurchase,
      purchases,
    });
  }

  cycleItems.sort((a, b) => b.totalSpend - a.totalSpend);

  // Period-level summaries
  const totalSpend = expenses.reduce((sum, e) => sum + Number(e.total_cost), 0);

  const byCategory = new Map<string, number>();
  for (const e of expenses) {
    const name = e.category?.name ?? '—';
    byCategory.set(name, (byCategory.get(name) ?? 0) + Number(e.total_cost));
  }
  const spendByCategory = [...byCategory.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  const topItemsBySpend = cycleItems
    .slice(0, 10)
    .map((c) => ({ itemName: c.itemName, total: c.totalSpend }));

  return {
    periodDays,
    totalSpend,
    spendByCategory,
    topItemsBySpend,
    cycleItems,
  };
}
