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
import { Loader2, MessageSquare, Star, TrendingUp, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

interface FeedbackRow {
  id: string;
  order_id: string;
  customer_phone: string;
  rating: number;
  comment: string | null;
  submitted_at: string;
  source: string;
  order: {
    order_number: string;
    customer_name: string;
    total: number;
    completed_at: string | null;
  } | null;
}

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
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-feedback', ratingFilter, fromDate, toDate, offset],
    queryFn: async (): Promise<FeedbackResponse> => {
      const params = new URLSearchParams();
      if (ratingFilter !== 'all') params.set('rating', ratingFilter);
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      params.set('limit', String(limit));
      params.set('offset', String(offset));
      const res = await adminFetch(`/api/admin/feedback?${params.toString()}`);
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
                    <div className="flex items-center gap-2">
                      <Stars rating={row.rating} />
                      {row.rating <= 2 ? (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">
                          low
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs max-w-md">
                    {row.comment ? (
                      <span className="text-foreground">{row.comment}</span>
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
