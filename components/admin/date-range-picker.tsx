'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  RANGE_PRESETS,
  matchPreset,
  type DateRange,
} from '@/lib/date-range';

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

/**
 * Quick presets (Last 7/30/90 days, This month) plus two native date inputs for
 * an arbitrary From/To range. Presentational — the parent owns the state.
 */
export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const activePreset = matchPreset(value);

  const setFrom = (from: string) => {
    if (!from) return;
    // Keep the range ordered: never let `from` exceed `to`.
    onChange({ from, to: from > value.to ? from : value.to });
  };

  const setTo = (to: string) => {
    if (!to) return;
    onChange({ from: to < value.from ? to : value.from, to });
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <div className="flex flex-wrap items-center gap-1">
        {RANGE_PRESETS.map((preset) => (
          <Button
            key={preset.key}
            type="button"
            size="sm"
            variant={activePreset === preset.key ? 'default' : 'outline'}
            onClick={() => onChange(preset.resolve())}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Label htmlFor="date-range-from" className="text-sm text-muted-foreground">
          From
        </Label>
        <Input
          id="date-range-from"
          type="date"
          value={value.from}
          max={value.to}
          onChange={(e) => setFrom(e.target.value)}
          className="w-[150px]"
        />
        <Label htmlFor="date-range-to" className="text-sm text-muted-foreground">
          To
        </Label>
        <Input
          id="date-range-to"
          type="date"
          value={value.to}
          min={value.from}
          onChange={(e) => setTo(e.target.value)}
          className="w-[150px]"
        />
      </div>
    </div>
  );
}
