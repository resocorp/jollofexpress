import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdminOnly } from '@/lib/auth/admin-auth';
import { buildExpenseAnalytics } from '@/lib/expenses/cycle-analysis';
import { resolveAnalyticsWindow } from '@/lib/date-range';
import type { ExpenseWithCategory } from '@/types/database';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await verifyAdminOnly(request);
  if (!auth.authenticated) return auth.response;

  const { searchParams } = new URL(request.url);
  const { from, to, endExclusive, periodDays } = resolveAnalyticsWindow(searchParams, 90);
  // Measure "days/orders since last purchase" against the window end, not wall-clock.
  const now = new Date(`${to}T23:59:59.999Z`);

  const supabase = createServiceClient();

  // 1. All expenses in window (with category name)
  const { data: expenses, error: expError } = await supabase
    .from('expenses')
    .select(
      `
        *,
        category:expense_categories(id, name)
      `,
    )
    .gte('purchase_date', from)
    .lte('purchase_date', to)
    .order('purchase_date', { ascending: true });

  if (expError) {
    console.error('[analytics/expenses] fetch expenses failed:', expError.message);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }

  // 2. Completed orders in the same window. We only need timestamps to count.
  //    Page through in chunks to avoid the default 1000-row limit.
  const completedOrders: { completed_at: string }[] = [];
  const PAGE_SIZE = 1000;
  for (let pageStart = 0; ; pageStart += PAGE_SIZE) {
    const { data: chunk, error: ordError } = await supabase
      .from('orders')
      .select('completed_at')
      .eq('status', 'completed')
      .not('completed_at', 'is', null)
      .gte('completed_at', from)
      .lt('completed_at', endExclusive)
      .order('completed_at', { ascending: true })
      .range(pageStart, pageStart + PAGE_SIZE - 1);
    if (ordError) {
      console.error('[analytics/expenses] fetch orders failed:', ordError.message);
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }
    if (!chunk || chunk.length === 0) break;
    for (const row of chunk) {
      if (row.completed_at) completedOrders.push({ completed_at: row.completed_at });
    }
    if (chunk.length < PAGE_SIZE) break;
  }

  const payload = buildExpenseAnalytics({
    expenses: (expenses ?? []) as unknown as ExpenseWithCategory[],
    completedOrders,
    periodDays,
    now,
  });

  return NextResponse.json(payload);
}
