'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useUpdateSettings } from '@/hooks/use-settings';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import type { OperatingHours } from '@/types/database';

interface OperatingHoursFormProps {
  data?: OperatingHours;
}

const DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

const DEFAULT_HOURS = {
  open: '09:00',
  close: '21:00',
  closed: false,
};

export function OperatingHoursForm({ data }: OperatingHoursFormProps) {
  const updateSettings = useUpdateSettings();
  const [hours, setHours] = useState<OperatingHours>(
    data || {
      monday: DEFAULT_HOURS,
      tuesday: DEFAULT_HOURS,
      wednesday: DEFAULT_HOURS,
      thursday: DEFAULT_HOURS,
      friday: DEFAULT_HOURS,
      saturday: DEFAULT_HOURS,
      sunday: DEFAULT_HOURS,
    }
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDayChange = (
    day: keyof OperatingHours,
    field: 'open' | 'close' | 'closed',
    value: string | boolean
  ) => {
    setHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate hours
      for (const day of DAYS) {
        const dayHours = hours[day];
        if (!dayHours.closed) {
          if (!dayHours.open || !dayHours.close) {
            toast.error(`Please set operating hours for ${day}`);
            setIsSubmitting(false);
            return;
          }
          if (dayHours.open >= dayHours.close) {
            toast.error(`Opening time must be before closing time for ${day}`);
            setIsSubmitting(false);
            return;
          }
        }
      }

      await updateSettings.mutateAsync({
        key: 'operating_hours',
        value: hours,
      });
      toast.success('Operating hours updated successfully');
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update operating hours');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {DAYS.map((day) => {
          const dayHours = hours[day];
          return (
            <div
              key={day}
              className="flex items-center gap-4 p-4 border rounded-lg"
            >
              <div className="w-32">
                <Label className="text-base capitalize">{day}</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={!dayHours.closed}
                  onCheckedChange={(checked) =>
                    handleDayChange(day, 'closed', !checked)
                  }
                />
                <span className="text-sm text-muted-foreground">
                  {dayHours.closed ? 'Closed' : 'Open'}
                </span>
              </div>

              {!dayHours.closed && (
                <>
                  <div className="flex items-center gap-2 flex-1">
                    <Label htmlFor={`${day}-open`} className="text-sm w-12">
                      From
                    </Label>
                    <Input
                      id={`${day}-open`}
                      type="time"
                      value={dayHours.open}
                      onChange={(e) =>
                        handleDayChange(day, 'open', e.target.value)
                      }
                      className="w-32"
                    />
                  </div>

                  <div className="flex items-center gap-2 flex-1">
                    <Label htmlFor={`${day}-close`} className="text-sm w-12">
                      To
                    </Label>
                    <Input
                      id={`${day}-close`}
                      type="time"
                      value={dayHours.close}
                      onChange={(e) =>
                        handleDayChange(day, 'close', e.target.value)
                      }
                      className="w-32"
                    />
                  </div>
                </>
              )}

              {dayHours.closed && (
                <div className="flex-1 text-sm text-muted-foreground">
                  Restaurant is closed on this day
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isSubmitting || updateSettings.isPending}
          className="min-w-[120px]"
        >
          {isSubmitting || updateSettings.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </form>
  );
}
