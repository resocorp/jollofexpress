'use client';

import { Fragment, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useExpenseAnalytics } from '@/hooks/use-expenses';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { ExpenseCycleItem } from '@/types/database';

const PERIODS = [
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
  { label: 'Last 180 days', value: 180 },
  { label: 'Last 365 days', value: 365 },
];

type SortKey =
  | 'name'
  | 'category'
  | 'lastPurchase'
  | 'avgOrders'
  | 'avgDays'
  | 'sinceOrders'
  | 'sinceDays'
  | 'totalSpend';

function ordersDisplay(value: number | null | undefined, fallback = '—'): string {
  if (value === null || value === undefined) return fallback;
  if (!Number.isFinite(value)) return fallback;
  return Math.round(value).toLocaleString();
}

function overdueState(item: ExpenseCycleItem): 'overdue' | 'due-soon' | 'ok' {
  if (item.averageOrdersPerCycle === null || item.averageOrdersPerCycle <= 0) return 'ok';
  const ratio = item.ordersSinceLastPurchase / item.averageOrdersPerCycle;
  if (ratio >= 1) return 'overdue';
  if (ratio >= 0.8) return 'due-soon';
  return 'ok';
}

export function CycleAnalysisTable() {
  const [periodDays, setPeriodDays] = useState<number>(90);
  const [sortKey, setSortKey] = useState<SortKey>('totalSpend');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data, isLoading } = useExpenseAnalytics(periodDays);

  const sorted = useMemo(() => {
    const items = [...(data?.cycleItems ?? [])];
    const dir = sortDir === 'asc' ? 1 : -1;
    items.sort((a, b) => {
      const get = (it: ExpenseCycleItem): number | string => {
        switch (sortKey) {
          case 'name': return it.itemName.toLowerCase();
          case 'category': return it.category.toLowerCase();
          case 'lastPurchase': return it.lastPurchaseDate;
          case 'avgOrders': return it.averageOrdersPerCycle ?? -1;
          case 'avgDays': return it.averageDaysPerCycle ?? -1;
          case 'sinceOrders': return it.ordersSinceLastPurchase;
          case 'sinceDays': return it.daysSinceLastPurchase;
          case 'totalSpend': return it.totalSpend;
        }
      };
      const av = get(a);
      const bv = get(b);
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
    return items;
  }, [data, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'name' || key === 'category' ? 'asc' : 'desc');
    }
  };

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const HeaderButton = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={() => toggleSort(k)}
      className="flex items-center gap-1 hover:text-foreground"
    >
      {children}
      {sortKey === k && <span className="text-[10px]">{sortDir === 'asc' ? '▲' : '▼'}</span>}
    </button>
  );

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Cycle analysis</CardTitle>
          <CardDescription>
            How many completed orders pass between consecutive purchases of the same item.
          </CardDescription>
        </div>
        <Select value={String(periodDays)} onValueChange={(v) => setPeriodDays(Number(v))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map((p) => (
              <SelectItem key={p.value} value={String(p.value)}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading…</div>
        ) : sorted.length === 0 ? (
          <p className="text-center py-12 text-muted-foreground">
            No purchases in this period yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead><HeaderButton k="name">Item</HeaderButton></TableHead>
                <TableHead><HeaderButton k="category">Category</HeaderButton></TableHead>
                <TableHead><HeaderButton k="lastPurchase">Last purchase</HeaderButton></TableHead>
                <TableHead className="text-right">
                  <HeaderButton k="avgOrders">Avg orders / cycle</HeaderButton>
                </TableHead>
                <TableHead className="text-right">
                  <HeaderButton k="avgDays">Avg days / cycle</HeaderButton>
                </TableHead>
                <TableHead className="text-right">
                  <HeaderButton k="sinceOrders">Orders since last</HeaderButton>
                </TableHead>
                <TableHead className="text-right">
                  <HeaderButton k="sinceDays">Days since last</HeaderButton>
                </TableHead>
                <TableHead className="text-right">
                  <HeaderButton k="totalSpend">Total spend</HeaderButton>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((item) => {
                const isOpen = expanded.has(item.itemNameNormalized);
                const status = overdueState(item);
                return (
                  <Fragment key={item.itemNameNormalized}>
                    <TableRow className="cursor-pointer hover:bg-muted/40" onClick={() => toggleExpand(item.itemNameNormalized)}>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          tabIndex={-1}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(item.itemNameNormalized);
                          }}
                        >
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {item.itemName}
                          {status === 'overdue' && (
                            <Badge variant="destructive" className="text-[10px]">Overdue</Badge>
                          )}
                          {status === 'due-soon' && (
                            <Badge className="text-[10px] bg-yellow-500/90">Due soon</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.category}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(item.lastPurchaseDate)}</TableCell>
                      <TableCell className="text-right">{ordersDisplay(item.averageOrdersPerCycle)}</TableCell>
                      <TableCell className="text-right">
                        {item.averageDaysPerCycle === null
                          ? '—'
                          : `${Math.round(item.averageDaysPerCycle)}`}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {item.ordersSinceLastPurchase.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">{item.daysSinceLastPurchase}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.totalSpend)}</TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow className="bg-muted/30">
                        <TableCell />
                        <TableCell colSpan={8}>
                          <div className="text-xs text-muted-foreground mb-2">
                            {item.purchaseCount} purchase{item.purchaseCount === 1 ? '' : 's'}
                          </div>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Qty</TableHead>
                                <TableHead className="text-right">Unit cost</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead>Vendor</TableHead>
                                <TableHead className="text-right">Orders since prev</TableHead>
                                <TableHead className="text-right">Days since prev</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {item.purchases.map((p) => (
                                <TableRow key={p.id}>
                                  <TableCell>{formatDate(p.purchase_date)}</TableCell>
                                  <TableCell className="text-right">
                                    {p.quantity}{p.unit ? ` ${p.unit}` : ''}
                                  </TableCell>
                                  <TableCell className="text-right">{formatCurrency(p.unit_cost)}</TableCell>
                                  <TableCell className="text-right font-medium">{formatCurrency(p.total_cost)}</TableCell>
                                  <TableCell className="text-muted-foreground">{p.vendor || '—'}</TableCell>
                                  <TableCell className="text-right">
                                    {p.orders_since_previous === null ? '—' : p.orders_since_previous.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {p.days_since_previous === null ? '—' : p.days_since_previous}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
