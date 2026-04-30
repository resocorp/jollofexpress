// Admin API: feedback sentiment analytics.
// Period-based (default 30 days), returns:
//   - sentiment distribution (count + %)
//   - average rating with growth vs previous period
//   - theme tally (top themes)
//   - sentiment trend by day
//   - lowest-rated comments (rating <= 2 or sentiment=negative)

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';

export const dynamic = 'force-dynamic';

interface FeedbackRow {
  id: string;
  rating: number;
  comment: string | null;
  submitted_at: string;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  sentiment_score: number | null;
  themes: string[] | null;
  order_id: string;
  customer_phone: string;
  order: {
    order_number: string;
    customer_name: string;
  } | null;
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const periodDays = Math.max(
      1,
      Math.min(parseInt(searchParams.get('period') || '30', 10), 365)
    );

    const now = new Date();
    const currentStart = new Date(now);
    currentStart.setDate(currentStart.getDate() - periodDays);
    const previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - periodDays);

    const supabase = createServiceClient();

    const [{ data: current }, { data: previous }] = await Promise.all([
      supabase
        .from('order_feedback')
        .select(
          `id, rating, comment, submitted_at, sentiment, sentiment_score, themes,
           order_id, customer_phone,
           order:orders (order_number, customer_name)`
        )
        .gte('submitted_at', currentStart.toISOString()),
      supabase
        .from('order_feedback')
        .select('rating, sentiment')
        .gte('submitted_at', previousStart.toISOString())
        .lt('submitted_at', currentStart.toISOString()),
    ]);

    const rows = ((current as FeedbackRow[] | null) || []).filter(Boolean);
    const prevRows = (previous as Array<{ rating: number; sentiment: string | null }> | null) || [];

    // --- distribution ---
    const distribution = { positive: 0, neutral: 0, negative: 0, unscored: 0 };
    for (const r of rows) {
      if (r.sentiment === 'positive') distribution.positive++;
      else if (r.sentiment === 'neutral') distribution.neutral++;
      else if (r.sentiment === 'negative') distribution.negative++;
      else distribution.unscored++;
    }
    const total = rows.length;
    const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

    // --- average rating + growth ---
    const avgRating = total
      ? Number((rows.reduce((s, r) => s + r.rating, 0) / total).toFixed(2))
      : 0;
    const prevAvg = prevRows.length
      ? Number((prevRows.reduce((s, r) => s + r.rating, 0) / prevRows.length).toFixed(2))
      : 0;
    const ratingGrowth = prevAvg ? Number((((avgRating - prevAvg) / prevAvg) * 100).toFixed(1)) : 0;

    // --- theme tally (sentiment-weighted) ---
    const themeCounts: Record<string, { count: number; positive: number; negative: number }> = {};
    for (const r of rows) {
      for (const t of r.themes || []) {
        const e = themeCounts[t] || { count: 0, positive: 0, negative: 0 };
        e.count++;
        if (r.sentiment === 'positive') e.positive++;
        if (r.sentiment === 'negative') e.negative++;
        themeCounts[t] = e;
      }
    }
    const themes = Object.entries(themeCounts)
      .map(([theme, v]) => ({ theme, ...v }))
      .sort((a, b) => b.count - a.count);

    // --- daily trend ---
    const trendMap = new Map<
      string,
      { positive: number; neutral: number; negative: number; total: number; sumRating: number }
    >();
    for (const r of rows) {
      const day = r.submitted_at.substring(0, 10); // YYYY-MM-DD
      const e = trendMap.get(day) || {
        positive: 0,
        neutral: 0,
        negative: 0,
        total: 0,
        sumRating: 0,
      };
      e.total++;
      e.sumRating += r.rating;
      if (r.sentiment === 'positive') e.positive++;
      else if (r.sentiment === 'neutral') e.neutral++;
      else if (r.sentiment === 'negative') e.negative++;
      trendMap.set(day, e);
    }
    const trend = Array.from(trendMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, v]) => ({
        day,
        positive: v.positive,
        neutral: v.neutral,
        negative: v.negative,
        total: v.total,
        avg_rating: Number((v.sumRating / v.total).toFixed(2)),
      }));

    // --- lowest-rated callouts (rating <=2 or sentiment=negative) ---
    const lowest = rows
      .filter(
        (r) =>
          r.rating <= 2 ||
          (r.sentiment === 'negative' && (r.comment?.trim().length || 0) > 0)
      )
      .sort((a, b) => {
        if (a.rating !== b.rating) return a.rating - b.rating;
        return (
          new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
        );
      })
      .slice(0, 20)
      .map((r) => ({
        id: r.id,
        order_id: r.order_id,
        order_number: r.order?.order_number || null,
        customer_name: r.order?.customer_name || null,
        customer_phone: r.customer_phone,
        rating: r.rating,
        comment: r.comment,
        sentiment: r.sentiment,
        themes: r.themes || [],
        submitted_at: r.submitted_at,
      }));

    return NextResponse.json({
      period_days: periodDays,
      total_feedback: total,
      avg_rating: avgRating,
      rating_growth_pct: ratingGrowth,
      distribution: {
        positive: { count: distribution.positive, pct: pct(distribution.positive) },
        neutral: { count: distribution.neutral, pct: pct(distribution.neutral) },
        negative: { count: distribution.negative, pct: pct(distribution.negative) },
        unscored: { count: distribution.unscored, pct: pct(distribution.unscored) },
      },
      themes,
      trend,
      lowest_rated: lowest,
    });
  } catch (err) {
    console.error('[admin/feedback-sentiment] error:', err);
    return NextResponse.json(
      { error: 'Failed to load sentiment analytics' },
      { status: 500 }
    );
  }
}
