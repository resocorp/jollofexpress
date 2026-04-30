'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminFetch } from '@/lib/api-client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, MessageSquare, Star, TrendingUp, AlertTriangle, Smile, Meh, Frown } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

type SentimentLabel = 'positive' | 'neutral' | 'negative';

interface FeedbackRow {
  id: string;
  order_id: string;
  customer_phone: string;
  rating: number;
  comment: string | null;
  submitted_at: string;
  source: string;
  sentiment: SentimentLabel | null;
  sentiment_score: number | null;
  themes: string[] | null;
  order: {
    order_number: string;
    customer_name: string;
    total: number;
    completed_at: string | null;
  } | null;
}

interface SentimentBucket {
  count: number;
  pct: number;
}

interface SentimentResponse {
  period_days: number;
  total_feedback: number;
  avg_rating: number;
  rating_growth_pct: number;
  distribution: {
    positive: SentimentBucket;
    neutral: SentimentBucket;
    negative: SentimentBucket;
    unscored: SentimentBucket;
  };
  themes: Array<{ theme: string; count: number; positive: number; negative: number }>;
  trend: Array<{
    day: string;
    positive: number;
    neutral: number;
    negative: number;
    total: number;
    avg_rating: number;
  }>;
  lowest_rated: Array<{
    id: string;
    order_id: string;
    order_number: string | null;
    customer_name: string | null;
    customer_phone: string;
    rating: number;
    comment: string | null;
    sentiment: SentimentLabel | null;
    themes: string[];
    submitted_at: string;
  }>;
}

const THEME_LABELS: Record<string, string> = {
  food_quality: 'Food quality',
  delivery_speed: 'Delivery speed',
  delivery_accuracy: 'Order accuracy',
  temperature: 'Temperature',
  packaging: 'Packaging',
  price: 'Price',
  customer_service: 'Customer service',
  app_experience: 'App experience',
  other: 'Other',
};

interface FeedbackSummary {
  count: number;
  avg: number;
  pct_positive: number;
  pct_negative: number;
}

interface FeedbackResponse {
  feedback: FeedbackRow[];
  pagination: { total: number; limit: number; offset: number; has_more: boolean };
  summary: { last_7_days: FeedbackSummary; last_30_days: FeedbackSummary };
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/40'
          }`}
        />
      ))}
    </div>
  );
}

export default function FeedbackPage() {
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [sentimentFilter, setSentimentFilter] = useState<string>('all');
  const [periodDays, setPeriodDays] = useState<string>('30');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-feedback', ratingFilter, sentimentFilter, fromDate, toDate, offset],
    queryFn: async (): Promise<FeedbackResponse> => {
      const params = new URLSearchParams();
      if (ratingFilter !== 'all') params.set('rating', ratingFilter);
      if (sentimentFilter !== 'all') params.set('sentiment', sentimentFilter);
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      params.set('limit', String(limit));
      params.set('offset', String(offset));
      const res = await adminFetch(`/api/admin/feedback?${params.toString()}`);
      return res.json();
    },
  });

  const { data: sentiment, isLoading: sentimentLoading } = useQuery({
    queryKey: ['admin-feedback-sentiment', periodDays],
    queryFn: async (): Promise<SentimentResponse> => {
      const res = await adminFetch(
        `/api/admin/analytics/feedback-sentiment?period=${periodDays}`
      );
      return res.json();
    },
  });

  const summary7 = data?.summary?.last_7_days;
  const summary30 = data?.summary?.last_30_days;
  const rows = data?.feedback || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Customer Feedback</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Inline WhatsApp ratings captured after order completion.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-5 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
              Avg rating (7d)
            </span>
            <Star className="h-4 w-4 text-yellow-400" />
          </div>
          <div className="text-2xl font-extrabold text-foreground">
            {summary7?.count ? summary7.avg.toFixed(2) : '—'}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {summary7?.count || 0} ratings
          </div>
        </div>

        <div className="bg-card rounded-xl p-5 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
              Avg rating (30d)
            </span>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-extrabold text-foreground">
            {summary30?.count ? summary30.avg.toFixed(2) : '—'}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {summary30?.count || 0} ratings
          </div>
        </div>

        <div className="bg-card rounded-xl p-5 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
              Positive (4–5★)
            </span>
            <TrendingUp className="h-4 w-4 text-green-400" />
          </div>
          <div className="text-2xl font-extrabold text-green-400">
            {summary30?.count ? `${summary30.pct_positive}%` : '—'}
          </div>
          <div className="text-xs text-muted-foreground mt-1">last 30d</div>
        </div>

        <div className="bg-card rounded-xl p-5 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
              Negative (1–2★)
            </span>
            <AlertTriangle className="h-4 w-4 text-red-400" />
          </div>
          <div className="text-2xl font-extrabold text-red-400">
            {summary30?.count ? `${summary30.pct_negative}%` : '—'}
          </div>
          <div className="text-xs text-muted-foreground mt-1">last 30d</div>
        </div>
      </div>

      {/* Sentiment & themes panel */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Sentiment & Themes</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              AI-classified feedback over the selected window.
            </p>
          </div>
          <Select value={periodDays} onValueChange={setPeriodDays}>
            <SelectTrigger className="w-32 bg-background border-border text-foreground text-sm h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {sentimentLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : sentiment && sentiment.total_feedback > 0 ? (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Distribution */}
            <div>
              <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-3">
                Sentiment ({sentiment.total_feedback} ratings)
              </div>
              <div className="space-y-2">
                <SentimentBar
                  icon={<Smile className="h-4 w-4 text-green-400" />}
                  label="Positive"
                  bucket={sentiment.distribution.positive}
                  color="bg-green-500"
                />
                <SentimentBar
                  icon={<Meh className="h-4 w-4 text-yellow-400" />}
                  label="Neutral"
                  bucket={sentiment.distribution.neutral}
                  color="bg-yellow-500"
                />
                <SentimentBar
                  icon={<Frown className="h-4 w-4 text-red-400" />}
                  label="Negative"
                  bucket={sentiment.distribution.negative}
                  color="bg-red-500"
                />
                {sentiment.distribution.unscored.count > 0 ? (
                  <div className="text-[11px] text-muted-foreground pt-1">
                    {sentiment.distribution.unscored.count} unscored — run{' '}
                    <code className="font-mono">backfill-feedback-sentiment</code>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Top themes */}
            <div>
              <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-3">
                Top themes
              </div>
              {sentiment.themes.length === 0 ? (
                <div className="text-xs text-muted-foreground italic">
                  No themes detected yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {sentiment.themes.slice(0, 6).map((t) => {
                    const max = sentiment.themes[0].count;
                    const widthPct = (t.count / max) * 100;
                    return (
                      <div key={t.theme}>
                        <div className="flex items-baseline justify-between text-xs mb-1">
                          <span className="text-foreground">
                            {THEME_LABELS[t.theme] || t.theme}
                          </span>
                          <span className="text-muted-foreground font-mono">
                            {t.count}
                          </span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden flex">
                          {t.positive > 0 ? (
                            <div
                              className="bg-green-500"
                              style={{ width: `${(t.positive / t.count) * widthPct}%` }}
                            />
                          ) : null}
                          {t.count - t.positive - t.negative > 0 ? (
                            <div
                              className="bg-yellow-500/70"
                              style={{
                                width: `${
                                  ((t.count - t.positive - t.negative) / t.count) *
                                  widthPct
                                }%`,
                              }}
                            />
                          ) : null}
                          {t.negative > 0 ? (
                            <div
                              className="bg-red-500"
                              style={{ width: `${(t.negative / t.count) * widthPct}%` }}
                            />
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Trend sparkline */}
            <div>
              <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-3">
                Daily volume
              </div>
              {sentiment.trend.length === 0 ? (
                <div className="text-xs text-muted-foreground italic">
                  No data in this window.
                </div>
              ) : (
                <TrendChart trend={sentiment.trend} />
              )}
              <div className="text-[11px] text-muted-foreground mt-2">
                Avg rating:{' '}
                <span className="font-semibold text-foreground">
                  {sentiment.avg_rating.toFixed(2)}
                </span>
                {sentiment.rating_growth_pct !== 0 ? (
                  <span
                    className={
                      sentiment.rating_growth_pct > 0 ? 'text-green-400 ml-2' : 'text-red-400 ml-2'
                    }
                  >
                    {sentiment.rating_growth_pct > 0 ? '+' : ''}
                    {sentiment.rating_growth_pct}% vs prev
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground italic py-4">
            No feedback in this window yet.
          </div>
        )}

        {/* Lowest-rated callouts */}
        {sentiment?.lowest_rated && sentiment.lowest_rated.length > 0 ? (
          <div className="border-t border-border pt-4">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
              Lowest-rated comments
            </div>
            <div className="space-y-2">
              {sentiment.lowest_rated.slice(0, 5).map((c) => (
                <div
                  key={c.id}
                  className="text-xs bg-red-500/5 border border-red-500/20 rounded-lg p-3"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Stars rating={c.rating} />
                    <span className="font-mono text-muted-foreground">
                      {c.order_number || c.order_id.substring(0, 8)}
                    </span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{c.customer_name || c.customer_phone}</span>
                  </div>
                  {c.comment ? (
                    <div className="text-foreground whitespace-pre-wrap break-words">
                      {c.comment}
                    </div>
                  ) : (
                    <div className="text-muted-foreground italic">no comment</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl p-4 border border-border flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">
            Rating
          </label>
          <Select
            value={ratingFilter}
            onValueChange={(v) => {
              setRatingFilter(v);
              setOffset(0);
            }}
          >
            <SelectTrigger className="w-36 bg-background border-border text-foreground text-sm h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="5">5 ★</SelectItem>
              <SelectItem value="4">4 ★</SelectItem>
              <SelectItem value="3">3 ★</SelectItem>
              <SelectItem value="2">2 ★</SelectItem>
              <SelectItem value="1">1 ★</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">
            Sentiment
          </label>
          <Select
            value={sentimentFilter}
            onValueChange={(v) => {
              setSentimentFilter(v);
              setOffset(0);
            }}
          >
            <SelectTrigger className="w-36 bg-background border-border text-foreground text-sm h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="positive">Positive</SelectItem>
              <SelectItem value="neutral">Neutral</SelectItem>
              <SelectItem value="negative">Negative</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">
            From
          </label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setOffset(0);
            }}
            className="bg-background border-border text-foreground text-sm h-9"
          />
        </div>

        <div>
          <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">
            To
          </label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setOffset(0);
            }}
            className="bg-background border-border text-foreground text-sm h-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No feedback yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Comment</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-xs whitespace-nowrap">
                    {new Date(row.submitted_at).toLocaleString('en-NG', {
                      timeZone: 'Africa/Lagos',
                    })}
                  </TableCell>
                  <TableCell className="text-xs font-mono">
                    {row.order?.order_number || row.order_id.substring(0, 8)}
                  </TableCell>
                  <TableCell className="text-xs font-mono">{row.customer_phone}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Stars rating={row.rating} />
                      {row.sentiment ? <SentimentChip sentiment={row.sentiment} /> : null}
                      {row.themes && row.themes.length > 0 ? (
                        <div className="flex gap-1 flex-wrap">
                          {row.themes.slice(0, 2).map((t) => (
                            <Badge
                              key={t}
                              variant="outline"
                              className="text-[10px] border-border text-muted-foreground"
                            >
                              {THEME_LABELS[t] || t}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs max-w-sm align-top">
                    {row.comment ? (
                      <div className="text-foreground whitespace-pre-wrap break-words">
                        {row.comment}
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono">
                    {row.order ? formatCurrency(row.order.total) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {data?.pagination ? (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing {offset + 1}–{Math.min(offset + limit, data.pagination.total)} of{' '}
            {data.pagination.total}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="text-muted-foreground border-border hover:bg-muted hover:text-foreground bg-transparent text-xs h-8"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset(offset + limit)}
              disabled={!data.pagination.has_more}
              className="text-muted-foreground border-border hover:bg-muted hover:text-foreground bg-transparent text-xs h-8"
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SentimentChip({ sentiment }: { sentiment: SentimentLabel }) {
  if (sentiment === 'positive') {
    return (
      <Badge className="bg-green-500/15 text-green-400 border-green-500/30 text-[10px]">
        positive
      </Badge>
    );
  }
  if (sentiment === 'negative') {
    return (
      <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-[10px]">
        negative
      </Badge>
    );
  }
  return (
    <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30 text-[10px]">
      neutral
    </Badge>
  );
}

function SentimentBar({
  icon,
  label,
  bucket,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  bucket: SentimentBucket;
  color: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="flex items-center gap-1.5 text-foreground">
          {icon}
          {label}
        </span>
        <span className="text-muted-foreground font-mono">
          {bucket.count} · {bucket.pct}%
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all`}
          style={{ width: `${bucket.pct}%` }}
        />
      </div>
    </div>
  );
}

function TrendChart({
  trend,
}: {
  trend: SentimentResponse['trend'];
}) {
  // Stacked-bar sparkline: positive (green) / neutral (yellow) / negative (red)
  // bars per day, height proportional to total volume.
  const max = Math.max(...trend.map((d) => d.total), 1);
  return (
    <div className="flex items-end gap-1 h-20">
      {trend.map((d) => {
        const heightPct = (d.total / max) * 100;
        const positivePct = d.total ? (d.positive / d.total) * 100 : 0;
        const neutralPct = d.total ? (d.neutral / d.total) * 100 : 0;
        const negativePct = d.total ? (d.negative / d.total) * 100 : 0;
        return (
          <div
            key={d.day}
            className="flex-1 flex flex-col justify-end min-w-[4px]"
            title={`${d.day}: ${d.total} ratings, avg ${d.avg_rating.toFixed(1)}`}
          >
            <div
              className="w-full rounded-sm overflow-hidden flex flex-col-reverse"
              style={{ height: `${heightPct}%` }}
            >
              {positivePct > 0 ? (
                <div className="bg-green-500" style={{ height: `${positivePct}%` }} />
              ) : null}
              {neutralPct > 0 ? (
                <div className="bg-yellow-500" style={{ height: `${neutralPct}%` }} />
              ) : null}
              {negativePct > 0 ? (
                <div className="bg-red-500" style={{ height: `${negativePct}%` }} />
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
