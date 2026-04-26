'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useExpenseCategories } from '@/hooks/use-expense-categories';
import {
  useCreateExpense,
  useUpdateExpense,
  type CreateExpenseInput,
} from '@/hooks/use-expenses';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';
import type { ExpenseWithCategory } from '@/types/database';

interface ExpenseFormProps {
  /** Existing item names (lowercased) for autocomplete suggestions. */
  itemSuggestions?: string[];
  /** Existing expense to edit. If unset, creates a new one. */
  initial?: ExpenseWithCategory | null;
  /** Called after a successful create/update. */
  onSubmitted?: () => void;
  /** Called when the user clicks Cancel (only relevant in edit mode). */
  onCancel?: () => void;
  /** When true, render in a tighter layout suitable for the kitchen tablet. */
  compact?: boolean;
}

function todayLocalISO(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const COMMON_UNITS = ['bottle', 'pack', 'kg', 'g', 'litre', 'ml', 'piece', 'box', 'carton', 'roll'];

export function ExpenseForm({
  itemSuggestions = [],
  initial = null,
  onSubmitted,
  onCancel,
  compact = false,
}: ExpenseFormProps) {
  const isEdit = !!initial;
  const { data: categories, isLoading: catsLoading } = useExpenseCategories();
  const create = useCreateExpense();
  const update = useUpdateExpense();

  const [categoryId, setCategoryId] = useState<string>(initial?.category_id ?? '');
  const [itemName, setItemName] = useState<string>(initial?.item_name ?? '');
  const [quantity, setQuantity] = useState<string>(
    initial ? String(initial.quantity) : '1',
  );
  const [unit, setUnit] = useState<string>(initial?.unit ?? '');
  const [unitCost, setUnitCost] = useState<string>(
    initial ? String(initial.unit_cost) : '',
  );
  const [vendor, setVendor] = useState<string>(initial?.vendor ?? '');
  const [purchaseDate, setPurchaseDate] = useState<string>(
    initial?.purchase_date ?? todayLocalISO(),
  );
  const [notes, setNotes] = useState<string>(initial?.notes ?? '');

  // When the categories load and we don't have a selected one yet, default to the first.
  useEffect(() => {
    if (!isEdit && !categoryId && categories && categories.length > 0) {
      setCategoryId(categories[0].id);
    }
  }, [isEdit, categoryId, categories]);

  const totalCost = useMemo(() => {
    const q = parseFloat(quantity);
    const u = parseFloat(unitCost);
    if (!Number.isFinite(q) || !Number.isFinite(u)) return 0;
    return Math.max(0, +(q * u).toFixed(2));
  }, [quantity, unitCost]);

  const filteredSuggestions = useMemo(() => {
    const needle = itemName.trim().toLowerCase();
    if (!needle) return [];
    const dedup = Array.from(new Set(itemSuggestions.map((s) => s.toLowerCase())));
    return dedup
      .filter((s) => s.includes(needle) && s !== needle)
      .slice(0, 6);
  }, [itemName, itemSuggestions]);

  const submitting = create.isPending || update.isPending;

  const reset = () => {
    setItemName('');
    setQuantity('1');
    setUnit('');
    setUnitCost('');
    setVendor('');
    setPurchaseDate(todayLocalISO());
    setNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) {
      toast.error('Pick a category');
      return;
    }
    if (itemName.trim().length < 2) {
      toast.error('Item name is too short');
      return;
    }
    const q = parseFloat(quantity);
    const u = parseFloat(unitCost);
    if (!Number.isFinite(q) || q <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }
    if (!Number.isFinite(u) || u < 0) {
      toast.error('Unit cost must be 0 or greater');
      return;
    }

    const payload: CreateExpenseInput = {
      category_id: categoryId,
      item_name: itemName.trim(),
      quantity: q,
      unit: unit.trim() || undefined,
      unit_cost: u,
      total_cost: totalCost,
      vendor: vendor.trim() || undefined,
      purchase_date: purchaseDate,
      notes: notes.trim() || undefined,
    };

    try {
      if (isEdit && initial) {
        await update.mutateAsync({ id: initial.id, data: payload });
        toast.success('Expense updated');
      } else {
        await create.mutateAsync(payload);
        toast.success('Purchase logged');
        reset();
      }
      onSubmitted?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save expense';
      toast.error(msg);
    }
  };

  const grid = compact ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-1 md:grid-cols-2 gap-4';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className={grid}>
        <div className="space-y-1.5">
          <Label htmlFor="exp-category">Category</Label>
          <Select value={categoryId} onValueChange={setCategoryId} disabled={catsLoading}>
            <SelectTrigger id="exp-category">
              <SelectValue placeholder={catsLoading ? 'Loading…' : 'Pick a category'} />
            </SelectTrigger>
            <SelectContent>
              {(categories ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="exp-purchase-date">Purchase date</Label>
          <Input
            id="exp-purchase-date"
            type="date"
            value={purchaseDate}
            max={todayLocalISO()}
            onChange={(e) => setPurchaseDate(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5 md:col-span-2 col-span-2 relative">
          <Label htmlFor="exp-item-name">Item name</Label>
          <Input
            id="exp-item-name"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="e.g. Dish soap, Foil packs, Tomatoes"
            autoComplete="off"
            list="exp-item-suggestions"
            required
          />
          {filteredSuggestions.length > 0 && (
            <datalist id="exp-item-suggestions">
              {filteredSuggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="exp-quantity">Quantity</Label>
          <Input
            id="exp-quantity"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="exp-unit">Unit (optional)</Label>
          <Input
            id="exp-unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="bottle, kg, pack…"
            list="exp-units"
          />
          <datalist id="exp-units">
            {COMMON_UNITS.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="exp-unit-cost">Unit cost (₦)</Label>
          <Input
            id="exp-unit-cost"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={unitCost}
            onChange={(e) => setUnitCost(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label>Total</Label>
          <div className="h-10 px-3 flex items-center rounded-md border bg-muted text-sm font-semibold">
            {formatCurrency(totalCost)}
          </div>
        </div>

        <div className="space-y-1.5 md:col-span-2 col-span-2">
          <Label htmlFor="exp-vendor">Vendor / supplier (optional)</Label>
          <Input
            id="exp-vendor"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            placeholder="e.g. Mile 12 Market, Shoprite"
          />
        </div>

        <div className="space-y-1.5 md:col-span-2 col-span-2">
          <Label htmlFor="exp-notes">Notes (optional)</Label>
          <Textarea
            id="exp-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything worth remembering — receipt #, batch #, etc."
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving…
            </>
          ) : isEdit ? (
            'Save changes'
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Log purchase
            </>
          )}
        </Button>
        {isEdit && onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
