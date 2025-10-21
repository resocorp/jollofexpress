'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useUpdateSettings } from '@/hooks/use-settings';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import type { OrderSettings } from '@/types/database';

const orderSettingsSchema = z.object({
  is_open: z.boolean(),
  default_prep_time: z
    .number()
    .int()
    .min(10, 'Prep time must be at least 10 minutes')
    .max(120, 'Prep time cannot exceed 120 minutes'),
  current_prep_time: z
    .number()
    .int()
    .min(10, 'Prep time must be at least 10 minutes')
    .max(120, 'Prep time cannot exceed 120 minutes'),
  auto_close_when_busy: z.boolean(),
  max_active_orders: z
    .number()
    .int()
    .min(5, 'Must be at least 5 orders')
    .max(50, 'Cannot exceed 50 orders'),
  max_advance_order_days: z
    .number()
    .int()
    .min(0, 'Must be 0 or greater')
    .max(30, 'Cannot exceed 30 days'),
});

type FormData = z.infer<typeof orderSettingsSchema>;

interface OrderSettingsFormProps {
  data?: OrderSettings & { 
    max_advance_order_days?: number;
    max_active_orders?: number;
  };
}

export function OrderSettingsForm({ data }: OrderSettingsFormProps) {
  const updateSettings = useUpdateSettings();

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(orderSettingsSchema),
    defaultValues: {
      is_open: data?.is_open ?? true,
      default_prep_time: data?.default_prep_time || 30,
      current_prep_time: data?.current_prep_time || 30,
      auto_close_when_busy: data?.auto_close_when_busy ?? false,
      max_active_orders: data?.max_active_orders || 10,
      max_advance_order_days: data?.max_advance_order_days ?? 0,
    },
  });

  const isOpen = watch('is_open');
  const autoClose = watch('auto_close_when_busy');

  const onSubmit = async (formData: FormData) => {
    try {
      await updateSettings.mutateAsync({
        key: 'order_settings',
        value: formData,
      });
      toast.success('Order settings updated successfully');
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update order settings');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Restaurant Open/Closed Status */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="space-y-0.5">
          <Label className="text-base">Restaurant Status</Label>
          <p className="text-sm text-muted-foreground">
            {isOpen
              ? 'Restaurant is currently accepting orders'
              : 'Restaurant is closed - not accepting orders'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-sm font-medium ${
              isOpen ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {isOpen ? 'Open' : 'Closed'}
          </span>
          <Controller
            name="is_open"
            control={control}
            render={({ field }) => (
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
        </div>
      </div>

      {!isOpen && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800 font-medium">
            ⚠️ Restaurant is currently closed
          </p>
          <p className="text-xs text-red-700 mt-1">
            Customers cannot place orders while the restaurant is closed. This
            can be quickly toggled from the Kitchen Display as well.
          </p>
        </div>
      )}

      {/* Preparation Times */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="default_prep_time">Default Prep Time (minutes)</Label>
          <Input
            id="default_prep_time"
            type="number"
            step="5"
            placeholder="30"
            {...register('default_prep_time', { valueAsNumber: true })}
            className={errors.default_prep_time ? 'border-red-500' : ''}
          />
          {errors.default_prep_time && (
            <p className="text-sm text-red-600">
              {errors.default_prep_time.message}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Standard preparation time shown to customers
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="current_prep_time">
            Current Prep Time (minutes)
          </Label>
          <Input
            id="current_prep_time"
            type="number"
            step="5"
            placeholder="30"
            {...register('current_prep_time', { valueAsNumber: true })}
            className={errors.current_prep_time ? 'border-red-500' : ''}
          />
          {errors.current_prep_time && (
            <p className="text-sm text-red-600">
              {errors.current_prep_time.message}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Actual prep time based on current kitchen capacity
          </p>
        </div>
      </div>

      {/* Advance Orders */}
      <div className="space-y-2">
        <Label htmlFor="max_advance_order_days">
          Advance Order Days
        </Label>
        <Input
          id="max_advance_order_days"
          type="number"
          min="0"
          max="30"
          placeholder="0"
          {...register('max_advance_order_days', { valueAsNumber: true })}
          className={errors.max_advance_order_days ? 'border-red-500' : ''}
        />
        {errors.max_advance_order_days && (
          <p className="text-sm text-red-600">
            {errors.max_advance_order_days.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          How many days in advance can customers place orders? (0 = same-day
          only)
        </p>
      </div>

      {/* Auto-close when busy */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="space-y-0.5">
          <Label className="text-base">Auto-close When Busy</Label>
          <p className="text-sm text-muted-foreground">
            Automatically stop accepting orders when kitchen is at capacity
          </p>
        </div>
        <Controller
          name="auto_close_when_busy"
          control={control}
          render={({ field }) => (
            <Switch
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </div>

      {autoClose && (
        <>
          <div className="space-y-2">
            <Label htmlFor="max_active_orders">
              Maximum Active Orders
            </Label>
            <Input
              id="max_active_orders"
              type="number"
              min="5"
              max="50"
              placeholder="10"
              {...register('max_active_orders', { valueAsNumber: true })}
              className={errors.max_active_orders ? 'border-red-500' : ''}
            />
            {errors.max_active_orders && (
              <p className="text-sm text-red-600">
                {errors.max_active_orders.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Restaurant will automatically close when this many orders are being prepared (5-50 orders)
            </p>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 When enabled, the restaurant will automatically close for new
              orders when active orders reach the threshold set above.
            </p>
          </div>
        </>
      )}

      {/* Information Box */}
      <div className="p-4 bg-gray-50 border rounded-lg">
        <h4 className="text-sm font-medium mb-2">Quick Tips</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>
            • Adjust <strong>current prep time</strong> during busy periods to
            set accurate expectations
          </li>
          <li>
            • Kitchen staff can also toggle restaurant status from the Kitchen
            Display
          </li>
          <li>
            • Use <strong>auto-close</strong> feature to prevent order overload
            during peak hours
          </li>
        </ul>
      </div>

      {/* Submit Button */}
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
