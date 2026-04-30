'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Edit2, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ExpenseForm } from '@/components/expenses/expense-form';
import { useDeleteExpense, useExpenses, type ExpenseFilters } from '@/hooks/use-expenses';
import { useExpenseCategories } from '@/hooks/use-expense-categories';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { toast } from 'sonner';
import type { ExpenseWithCategory } from '@/types/database';

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const RANGE_OPTIONS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Last 365 days', days: 365 },
];

export function ExpensesTable() {
  const [rangeDays, setRangeDays] = useState<number>(30);
  const [categoryId, setCategoryId] = useState<string>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<ExpenseWithCategory | null>(null);
  const [deleting, setDeleting] = useState<ExpenseWithCategory | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleBatch = (date: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const filters: ExpenseFilters = useMemo(
    () => ({
      from: daysAgoISO(rangeDays),
      to: new Date().toISOString().slice(0, 10),
      categoryId: categoryId === 'all' ? undefined : categoryId,
      search: search || undefined,
      limit: 1000,
    }),
    [rangeDays, categoryId, search],
  );

  const { data: expenses, isLoading } = useExpenses(filters);
  const { data: categories } = useExpenseCategories(true);
  const deleteExpense = useDeleteExpense();

  const totals = useMemo(() => {
    const total = (expenses ?? []).reduce((sum, e) => sum + Number(e.total_cost), 0);
    return { total, count: expenses?.length ?? 0 };
  }, [expenses]);

  const batches = useMemo(() => {
    const groups = new Map<string, ExpenseWithCategory[]>();
    for (const e of expenses ?? []) {
      const key = e.purchase_date;
      const list = groups.get(key);
      if (list) list.push(e);
      else groups.set(key, [e]);
    }
    return Array.from(groups.entries())
      .map(([date, items]) => {
        const sorted = [...items].sort((a, b) => a.item_name.localeCompare(b.item_name));
        const totalCost = sorted.reduce((sum, e) => sum + Number(e.total_cost), 0);
        return { date, items: sorted, totalCost, itemCount: sorted.length };
      })
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [expenses]);

  const onConfirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteExpense.mutateAsync(deleting.id);
      toast.success('Expense deleted');
      setDeleting(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expenses</CardTitle>
        <CardDescription>All purchases logged across kitchen and admin.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={String(rangeDays)} onValueChange={(v) => setRangeDays(Number(v))}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.days} value={String(opt.days)}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {(categories ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                  {!c.is_active ? ' (inactive)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(searchInput.trim());
            }}
            className="flex items-center gap-2"
          >
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search items…"
                className="pl-8 w-[220px]"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm">
              Search
            </Button>
            {search && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setSearchInput('');
                }}
              >
                Clear
              </Button>
            )}
          </form>

          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">{totals.count} entries</span>
            <Badge variant="secondary" className="text-base">
              {formatCurrency(totals.total)}
            </Badge>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading…</div>
        ) : batches.length > 0 ? (
          <div className="space-y-3">
            {batches.map((batch) => {
              const isOpen = expanded.has(batch.date);
              return (
                <div key={batch.date} className="rounded-md border">
                  <button
                    type="button"
                    onClick={() => toggleBatch(batch.date)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                  >
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-medium">{formatDate(batch.date)}</span>
                    <span className="text-sm text-muted-foreground">
                      {batch.itemCount} item{batch.itemCount === 1 ? '' : 's'}
                    </span>
                    <Badge variant="secondary" className="ml-auto text-base">
                      {formatCurrency(batch.totalCost)}
                    </Badge>
                  </button>
                  {isOpen && (
                    <div className="border-t bg-muted/20">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Unit cost</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead>Vendor</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {batch.items.map((e) => (
                            <TableRow key={e.id}>
                              <TableCell className="font-medium">{e.item_name}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{e.category?.name ?? '—'}</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {Number(e.quantity)}
                                {e.unit ? ` ${e.unit}` : ''}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(Number(e.unit_cost))}
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatCurrency(Number(e.total_cost))}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {e.vendor || '—'}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setEditing(e)}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setDeleting(e)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center py-12 text-muted-foreground">
            No expenses recorded for this filter.
          </p>
        )}
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit expense</DialogTitle>
          </DialogHeader>
          {editing && (
            <ExpenseForm
              initial={editing}
              onSubmitted={() => setEditing(null)}
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the entry for{' '}
              <strong>{deleting?.item_name}</strong> on{' '}
              <strong>{deleting && formatDate(deleting.purchase_date)}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
