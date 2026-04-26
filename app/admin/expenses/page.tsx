'use client';

import { useMemo, useState } from 'react';
import { BarChart3, Plus, Receipt, Repeat, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ExpenseBatchForm } from '@/components/expenses/expense-batch-form';
import { ExpensesTable } from './_components/expenses-table';
import { CycleAnalysisTable } from './_components/cycle-analysis-table';
import { CategoriesManager } from './_components/categories-manager';
import { ExpenseSummary } from './_components/expense-summary';
import { useExpenses } from '@/hooks/use-expenses';

type Tab = 'expenses' | 'cycles' | 'summary' | 'categories';

export default function AdminExpensesPage() {
  const [tab, setTab] = useState<Tab>('expenses');
  const [logOpen, setLogOpen] = useState(false);

  // Pull recent items purely for the form's autocomplete suggestions.
  const { data: recent } = useExpenses({
    from: (() => {
      const d = new Date();
      d.setDate(d.getDate() - 180);
      return d.toISOString().slice(0, 10);
    })(),
    to: new Date().toISOString().slice(0, 10),
    limit: 500,
  });

  const itemSuggestions = useMemo(
    () => Array.from(new Set((recent ?? []).map((e) => e.item_name))),
    [recent],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Receipt className="h-7 w-7" />
            Expenses
          </h1>
          <p className="text-muted-foreground mt-2">
            Track procurement, manage categories, and see consumption cycles.
          </p>
        </div>
        <Button onClick={() => setLogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Log purchase
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="expenses" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Expenses
          </TabsTrigger>
          <TabsTrigger value="cycles" className="flex items-center gap-2">
            <Repeat className="h-4 w-4" />
            Cycle analysis
          </TabsTrigger>
          <TabsTrigger value="summary" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Summary
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Categories
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="space-y-6">
          <ExpensesTable />
        </TabsContent>

        <TabsContent value="cycles" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>How this works</CardTitle>
              <CardDescription>
                For each item you&apos;ve purchased more than once, we count the number of completed
                orders processed between consecutive purchases — your real-world consumption cycle.
                E.g. &ldquo;1 bottle of dish soap took 100 shawarmas before re-buy.&rdquo;
              </CardDescription>
            </CardHeader>
          </Card>
          <CycleAnalysisTable />
        </TabsContent>

        <TabsContent value="summary" className="space-y-6">
          <ExpenseSummary />
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <CategoriesManager />
        </TabsContent>
      </Tabs>

      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Log purchases</DialogTitle>
          </DialogHeader>
          <ExpenseBatchForm
            itemSuggestions={itemSuggestions}
            onSubmitted={() => setLogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
