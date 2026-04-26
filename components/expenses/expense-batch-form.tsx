'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardPaste, Loader2, Plus, X } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useExpenseCategories } from '@/hooks/use-expense-categories';
import {
  useCreateExpenseBatch,
  type BatchExpenseItem,
} from '@/hooks/use-expenses';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';
import type { ExpenseCategory } from '@/types/database';

const COMMON_UNITS = ['bottle', 'pack', 'kg', 'g', 'litre', 'ml', 'piece', 'box', 'carton', 'roll'];

interface DraftRow {
  id: string;
  category_id: string;
  item_name: string;
  quantity: string;
  unit: string;
  unit_cost: string;
}

function todayLocalISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function newRowId(): string {
  // browser-safe; falls back to a Math.random id for older runtimes
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyRow(categoryId = ''): DraftRow {
  return {
    id: newRowId(),
    category_id: categoryId,
    item_name: '',
    quantity: '',
    unit: '',
    unit_cost: '',
  };
}

function parseNumber(s: string): number {
  const cleaned = s.replace(/[₦,\s]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

function rowTotal(row: DraftRow): number {
  const q = parseNumber(row.quantity);
  const u = parseNumber(row.unit_cost);
  if (!Number.isFinite(q) || !Number.isFinite(u)) return 0;
  return Math.max(0, +(q * u).toFixed(2));
}

function rowIsValid(row: DraftRow): boolean {
  const q = parseNumber(row.quantity);
  const u = parseNumber(row.unit_cost);
  return (
    !!row.category_id &&
    row.item_name.trim().length >= 2 &&
    Number.isFinite(q) &&
    q > 0 &&
    Number.isFinite(u) &&
    u >= 0
  );
}

function rowIsEmpty(row: DraftRow): boolean {
  return (
    !row.item_name.trim() &&
    !row.quantity.trim() &&
    !row.unit.trim() &&
    !row.unit_cost.trim()
  );
}

interface ExpenseBatchFormProps {
  itemSuggestions?: string[];
  onSubmitted?: (count: number, totalSpend: number) => void;
  compact?: boolean;
}

export function ExpenseBatchForm({
  itemSuggestions = [],
  onSubmitted,
  compact = false,
}: ExpenseBatchFormProps) {
  const { data: categories, isLoading: catsLoading } = useExpenseCategories();
  const createBatch = useCreateExpenseBatch();

  const [purchaseDate, setPurchaseDate] = useState<string>(todayLocalISO());
  const [vendor, setVendor] = useState('');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<DraftRow[]>([emptyRow()]);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');

  // Once categories load, default the first row's category to the first active one.
  useEffect(() => {
    if (!categories || categories.length === 0) return;
    setRows((prev) =>
      prev.map((r) => (r.category_id ? r : { ...r, category_id: categories[0].id })),
    );
  }, [categories]);

  // Track the unit-cost input refs so Enter on the last row's unit-cost can add a row
  // and focus the new row's category trigger.
  const unitCostRefs = useRef<Map<string, HTMLInputElement | null>>(new Map());
  const focusNewRowOnNextRender = useRef<string | null>(null);

  useEffect(() => {
    const id = focusNewRowOnNextRender.current;
    if (!id) return;
    focusNewRowOnNextRender.current = null;
    // Focus the item-name input of the new row (categories has a default already).
    const el = document.querySelector<HTMLInputElement>(
      `[data-row-id="${id}"][data-field="item_name"]`,
    );
    el?.focus();
  }, [rows.length]);

  const grandTotal = useMemo(
    () => rows.reduce((sum, r) => sum + rowTotal(r), 0),
    [rows],
  );

  const validCount = useMemo(() => rows.filter(rowIsValid).length, [rows]);

  const updateRow = (id: string, patch: Partial<DraftRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    const defaultCat = categories?.[0]?.id ?? '';
    const r = emptyRow(defaultCat);
    focusNewRowOnNextRender.current = r.id;
    setRows((prev) => [...prev, r]);
  };

  const removeRow = (id: string) => {
    setRows((prev) => {
      const next = prev.filter((r) => r.id !== id);
      return next.length === 0 ? [emptyRow(categories?.[0]?.id ?? '')] : next;
    });
  };

  const handleUnitCostKey = (rowId: string, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const isLast = rows[rows.length - 1]?.id === rowId;
      if (isLast) {
        addRow();
      } else {
        // jump to next row's item name
        const idx = rows.findIndex((r) => r.id === rowId);
        const next = rows[idx + 1];
        if (next) {
          document
            .querySelector<HTMLInputElement>(
              `[data-row-id="${next.id}"][data-field="item_name"]`,
            )
            ?.focus();
        }
      }
    }
  };

  const handlePaste = () => {
    if (!pasteText.trim()) {
      setPasteOpen(false);
      return;
    }
    const lines = pasteText.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length === 0) {
      setPasteOpen(false);
      return;
    }

    const splitLine = (line: string): string[] => {
      // Prefer tabs (Excel/Sheets default). If no tabs, fall back to comma.
      if (line.includes('\t')) return line.split('\t').map((c) => c.trim());
      return line.split(',').map((c) => c.trim());
    };

    // Skip the header row if first cell looks like "category"
    const first = splitLine(lines[0]);
    const dataLines =
      first[0]?.toLowerCase().includes('category') ? lines.slice(1) : lines;

    const catByName = new Map<string, ExpenseCategory>();
    for (const c of categories ?? []) {
      catByName.set(c.name.toLowerCase().trim(), c);
    }
    const fallbackCatId = categories?.[0]?.id ?? '';

    const parsed: DraftRow[] = dataLines.map((line) => {
      const cells = splitLine(line);
      const [catCell = '', item = '', qty = '', unitCell = '', cost = ''] = cells;
      const matched = catByName.get(catCell.toLowerCase().trim());
      return {
        id: newRowId(),
        // Empty category_id signals "needs picker" — UI renders red.
        category_id: matched?.id ?? (catCell.trim() ? '' : fallbackCatId),
        item_name: item,
        quantity: qty,
        unit: unitCell,
        unit_cost: cost,
      };
    });

    if (parsed.length === 0) {
      toast.error('Nothing to paste');
      setPasteOpen(false);
      return;
    }

    setRows((prev) => {
      // If existing rows are all empty, replace; otherwise append.
      const existing = prev.filter((r) => !rowIsEmpty(r));
      return [...existing, ...parsed];
    });

    const unmatched = parsed.filter((r) => !r.category_id).length;
    toast.success(
      unmatched > 0
        ? `Pasted ${parsed.length} rows · ${unmatched} need a category`
        : `Pasted ${parsed.length} rows`,
    );
    setPasteText('');
    setPasteOpen(false);
  };

  const handleSave = async () => {
    if (!purchaseDate || !/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate)) {
      toast.error('Pick a purchase date');
      return;
    }
    const skipped = rows.length - validCount;
    const validRows = rows.filter(rowIsValid);
    if (validRows.length === 0) {
      toast.error('No complete rows to save');
      return;
    }

    const items: BatchExpenseItem[] = validRows.map((r) => ({
      category_id: r.category_id,
      item_name: r.item_name.trim(),
      quantity: parseNumber(r.quantity),
      unit: r.unit.trim() || undefined,
      unit_cost: parseNumber(r.unit_cost),
      total_cost: rowTotal(r),
    }));

    try {
      const res = await createBatch.mutateAsync({
        default_purchase_date: purchaseDate,
        default_vendor: vendor.trim() || undefined,
        default_notes: notes.trim() || undefined,
        items,
      });
      const skippedSuffix = skipped > 0 ? ` · skipped ${skipped} incomplete` : '';
      toast.success(
        `Logged ${res.inserted} item${res.inserted === 1 ? '' : 's'} · ${formatCurrency(res.total_spend)}${skippedSuffix}`,
      );
      // Reset to a fresh single empty row, but keep the date/vendor (likely same trip).
      setRows([emptyRow(categories?.[0]?.id ?? '')]);
      setNotes('');
      onSubmitted?.(res.inserted, res.total_spend);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save batch';
      toast.error(msg);
      // Keep entered rows so the user doesn't lose typing.
    }
  };

  const submitting = createBatch.isPending;
  const headerGap = compact ? 'gap-3' : 'gap-4';

  return (
    <div className="space-y-4">
      {/* Shared header */}
      <div className={`grid grid-cols-1 md:grid-cols-3 ${headerGap}`}>
        <div className="space-y-1.5">
          <Label htmlFor="batch-date">Purchase date</Label>
          <Input
            id="batch-date"
            type="date"
            value={purchaseDate}
            max={todayLocalISO()}
            onChange={(e) => setPurchaseDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="batch-vendor">Vendor (applies to all rows)</Label>
          <Input
            id="batch-vendor"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            placeholder="e.g. Mile 12 Market"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="batch-notes">Notes (optional)</Label>
          <Input
            id="batch-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Receipt #, batch #, etc."
          />
        </div>
      </div>

      {/* Rows */}
      <div className="border rounded-lg overflow-hidden">
        <div className="hidden md:grid md:grid-cols-[minmax(160px,1.4fr)_minmax(180px,2fr)_90px_110px_120px_110px_36px] gap-2 px-3 py-2 bg-muted text-xs font-medium text-muted-foreground">
          <div>Category</div>
          <div>Item</div>
          <div className="text-right">Qty</div>
          <div>Unit</div>
          <div className="text-right">Unit cost (₦)</div>
          <div className="text-right">Total</div>
          <div />
        </div>
        <div className="divide-y">
          {rows.map((row) => {
            const total = rowTotal(row);
            const valid = rowIsValid(row);
            const filled = !rowIsEmpty(row);
            const missingCategory = filled && !row.category_id;
            return (
              <div
                key={row.id}
                className={`grid grid-cols-2 md:grid-cols-[minmax(160px,1.4fr)_minmax(180px,2fr)_90px_110px_120px_110px_36px] gap-2 px-3 py-2 items-center ${
                  missingCategory ? 'bg-destructive/5' : ''
                }`}
              >
                <div className="col-span-2 md:col-span-1">
                  <Select
                    value={row.category_id || undefined}
                    onValueChange={(v) => updateRow(row.id, { category_id: v })}
                    disabled={catsLoading}
                  >
                    <SelectTrigger
                      className={missingCategory ? 'border-destructive' : ''}
                      aria-label="Category"
                    >
                      <SelectValue
                        placeholder={catsLoading ? 'Loading…' : 'Pick category'}
                      />
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

                <div className="col-span-2 md:col-span-1">
                  <Input
                    data-row-id={row.id}
                    data-field="item_name"
                    value={row.item_name}
                    onChange={(e) => updateRow(row.id, { item_name: e.target.value })}
                    placeholder="Item name"
                    list={itemSuggestions.length > 0 ? 'batch-item-suggestions' : undefined}
                    autoComplete="off"
                  />
                </div>

                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={row.quantity}
                  onChange={(e) => updateRow(row.id, { quantity: e.target.value })}
                  className="text-right"
                  placeholder="Qty"
                  aria-label="Quantity"
                />

                <Input
                  value={row.unit}
                  onChange={(e) => updateRow(row.id, { unit: e.target.value })}
                  placeholder="bottle…"
                  list="batch-unit-suggestions"
                  aria-label="Unit"
                />

                <Input
                  ref={(el) => {
                    if (el) unitCostRefs.current.set(row.id, el);
                    else unitCostRefs.current.delete(row.id);
                  }}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={row.unit_cost}
                  onChange={(e) => updateRow(row.id, { unit_cost: e.target.value })}
                  onKeyDown={(e) => handleUnitCostKey(row.id, e)}
                  className="text-right"
                  placeholder="0"
                  aria-label="Unit cost"
                />

                <div className="text-right font-medium tabular-nums">
                  {filled && valid ? formatCurrency(total) : <span className="text-muted-foreground">—</span>}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 justify-self-end"
                  onClick={() => removeRow(row.id)}
                  aria-label="Remove row"
                  disabled={rows.length === 1 && rowIsEmpty(row)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {itemSuggestions.length > 0 && (
        <datalist id="batch-item-suggestions">
          {itemSuggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
      <datalist id="batch-unit-suggestions">
        {COMMON_UNITS.map((u) => (
          <option key={u} value={u} />
        ))}
      </datalist>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={addRow}>
          <Plus className="h-4 w-4 mr-2" />
          Add row
        </Button>
        <Button type="button" variant="outline" onClick={() => setPasteOpen(true)}>
          <ClipboardPaste className="h-4 w-4 mr-2" />
          Paste from spreadsheet
        </Button>

        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">
            {validCount} of {rows.length} ready
          </span>
          <span className="text-base font-semibold tabular-nums">
            Grand total: {formatCurrency(grandTotal)}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          onClick={handleSave}
          disabled={submitting || validCount === 0}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving…
            </>
          ) : (
            <>Save all ({validCount} item{validCount === 1 ? '' : 's'})</>
          )}
        </Button>
      </div>

      <Dialog open={pasteOpen} onOpenChange={setPasteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Paste from spreadsheet</DialogTitle>
            <DialogDescription>
              Paste rows from Excel or Google Sheets. Columns:{' '}
              <strong>Category, Item, Qty, Unit, Unit cost</strong>. Tabs or commas both work; the
              header row is skipped automatically.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={10}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={`Cleaning Supplies\tDish soap\t2\tbottle\t800
Ingredients\tTomatoes\t5\tkg\t1200`}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPasteOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handlePaste}>
              Add to list
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
