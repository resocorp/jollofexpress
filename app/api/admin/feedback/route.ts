// Admin API: list order_feedback rows + summary stats.
// Filters: ?rating=1..5&from=YYYY-MM-DD&to=YYYY-MM-DD&limit=&offset=

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';

export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) return authResult.response;

  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);

    const ratingParam = searchParams.get('rating');
    const ratingFilter = ratingParam ? parseInt(ratingParam, 10) : null;
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let query = supabase
      .from('order_feedback')
      .select(
        `id, order_id, customer_phone, rating, comment, submitted_at, source,
         order:orders (
           order_number, customer_name, total, completed_at
         )`,
        { count: 'exact' }
      )
      .order('submitted_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (ratingFilter && ratingFilter >= 1 && ratingFilter <= 5) {
      query = query.eq('rating', ratingFilter);
    }
    if (fromDate) query = query.gte('submitted_at', fromDate);
    if (toDate) query = query.lte('submitted_at', toDate + 'T23:59:59');

    const { data: rows, error, count } = await query;
    if (error) {
      console.error('[admin/feedback] query failed:', error);
      return NextResponse.json({ error: 'Failed to load feedback' }, { status: 500 });
    }

    // Summary: avg rating + rating breakdown for last 7d and 30d windows
    const now = Date.now();
    const since7 = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    const since30 = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [{ data: last7 }, { data: last30 }] = await Promise.all([
      supabase
        .from('order_feedback')
        .select('rating')
        .gte('submitted_at', since7),
      supabase
        .from('order_feedback')
        .select('rating')
        .gte('submitted_at', since30),
    ]);

    function summarize(rs: Array<{ rating: number }> | null) {
      const arr = rs || [];
      if (arr.length === 0) {
        return { count: 0, avg: 0, pct_positive: 0, pct_negative: 0 };
      }
      const sum = arr.reduce((s, r) => s + r.rating, 0);
      const positive = arr.filter((r) => r.rating >= 4).length;
      const negative = arr.filter((r) => r.rating <= 2).length;
      return {
        count: arr.length,
        avg: Number((sum / arr.length).toFixed(2)),
        pct_positive: Math.round((positive / arr.length) * 100),
        pct_negative: Math.round((negative / arr.length) * 100),
      };
    }

    return NextResponse.json({
      feedback: rows || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        has_more: (count || 0) > offset + limit,
      },
      summary: {
        last_7_days: summarize(last7),
        last_30_days: summarize(last30),
      },
    });
  } catch (err) {
    console.error('[admin/feedback] unexpected:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
