'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { ExpenseBatchForm } from '@/components/expenses/expense-batch-form';
import { useExpenses } from '@/hooks/use-expenses';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate } from '@/lib/formatters';

function todayLocalISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function KitchenProcurementPage() {
  const router = useRouter();
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/kitchen/login');
        return;
      }
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();
      if (!profile || (profile.role !== 'admin' && profile.role !== 'kitchen')) {
        router.push('/kitchen/login');
        return;
      }
      setIsAuthed(true);
    };
    check();
  }, [router]);

  const today = todayLocalISO();
  const { data: todays, isLoading: todaysLoading } = useExpenses(
    isAuthed ? { from: today, to: today, limit: 50 } : undefined,
  );

  // Pull a wider window of names purely for autocomplete suggestions
  const { data: recent } = useExpenses(
    isAuthed
      ? {
          from: (() => {
            const d = new Date();
            d.setDate(d.getDate() - 90);
            return d.toISOString().slice(0, 10);
          })(),
          to: today,
          limit: 500,
        }
      : undefined,
  );

  const itemSuggestions = useMemo(
    () => Array.from(new Set((recent ?? []).map((e) => e.item_name))),
    [recent],
  );

  const todayTotal = useMemo(
    () => (todays ?? []).reduce((sum, e) => sum + Number(e.total_cost), 0),
    [todays],
  );

  if (isAuthed === null) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/kitchen">
              <Button
                variant="outline"
                size="sm"
                className="border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kitchen
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Receipt className="h-6 w-6" />
                Procurement
              </h1>
              <p className="text-sm text-gray-400">
                Log purchases for cleaning supplies, packaging, ingredients, and more.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        <Card className="bg-white text-gray-900">
          <CardHeader>
            <CardTitle>Log purchases</CardTitle>
            <CardDescription>
              Add a row per item, or paste a list from a spreadsheet. Totals are calculated
              automatically — hit <strong>Enter</strong> on the last cell to add another row.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExpenseBatchForm itemSuggestions={itemSuggestions} compact />
          </CardContent>
        </Card>

        <Card className="bg-white text-gray-900">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Today&apos;s entries</CardTitle>
              <CardDescription>{formatDate(new Date())}</CardDescription>
            </div>
            <Badge variant="secondary" className="text-base">
              {formatCurrency(todayTotal)}
            </Badge>
          </CardHeader>
          <CardContent>
            {todaysLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading…</div>
            ) : todays && todays.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit cost</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Vendor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todays.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.item_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{e.category?.name ?? '—'}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(e.quantity)}
                        {e.unit ? ` ${e.unit}` : ''}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(e.unit_cost))}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(Number(e.total_cost))}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {e.vendor || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center py-6 text-muted-foreground">
                No purchases logged yet today.
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
