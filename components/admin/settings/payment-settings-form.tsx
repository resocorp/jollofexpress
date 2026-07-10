'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateSettings } from '@/hooks/use-settings';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import type { PaymentSettings } from '@/types/database';

const paymentSettingsSchema = z.object({
  tax_rate: z
    .number()
    .min(0, 'Tax rate must be 0 or greater')
    .max(100, 'Tax rate cannot exceed 100%'),
  accept_cash: z.boolean(),
  accept_card: z.boolean(),
  accept_transfer: z.boolean(),
  payments_blocked: z.boolean(),
  blocked_message: z.string().max(200, 'Message cannot exceed 200 characters'),
});

type FormData = z.infer<typeof paymentSettingsSchema>;

interface PaymentSettingsFormProps {
  data?: PaymentSettings;
}

export function PaymentSettingsForm({ data }: PaymentSettingsFormProps) {
  const updateSettings = useUpdateSettings();

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(paymentSettingsSchema),
    defaultValues: {
      tax_rate: data?.tax_rate ?? 0,
      accept_cash: data?.accept_cash ?? true,
      accept_card: data?.accept_card ?? true,
      accept_transfer: data?.accept_transfer ?? false,
      payments_blocked: data?.payments_blocked ?? false,
      blocked_message: data?.blocked_message ?? '',
    },
  });

  const acceptCash = watch('accept_cash');
  const acceptCard = watch('accept_card');
  const acceptTransfer = watch('accept_transfer');
  const paymentsBlocked = watch('payments_blocked');

  const onSubmit = async (formData: FormData) => {
    // Validate at least one payment method is selected
    if (!formData.accept_cash && !formData.accept_card && !formData.accept_transfer) {
      toast.error('Please select at least one payment method');
      return;
    }

    try {
      await updateSettings.mutateAsync({
        key: 'payment_settings',
        value: formData,
      });
      toast.success('Payment settings updated successfully');
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update payment settings');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Block Payments / Pause Ordering kill switch */}
      <div
        className={`rounded-lg border p-4 ${
          paymentsBlocked ? 'border-red-300 bg-red-50' : ''
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base">Pause Ordering</Label>
            <p className="text-sm text-muted-foreground">
              {paymentsBlocked
                ? 'Customers cannot place orders or pay right now'
                : 'Customers can place orders and pay normally'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`text-sm font-medium ${
                paymentsBlocked ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {paymentsBlocked ? 'Blocked' : 'Accepting'}
            </span>
            <Controller
              name="payments_blocked"
              control={control}
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>
        </div>

        {paymentsBlocked && (
          <div className="mt-4 space-y-2">
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-medium text-red-800">
                ⚠️ Ordering is paused
              </p>
              <p className="mt-1 text-xs text-red-700">
                No new orders or payments will be accepted until you turn this off.
                Turn this on when you&apos;re closed for the day, at capacity, or
                during an event.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="blocked_message">Message shown to customers</Label>
              <Textarea
                id="blocked_message"
                rows={2}
                placeholder="We're closed for a private event — back tomorrow!"
                {...register('blocked_message')}
                className={errors.blocked_message ? 'border-red-500' : ''}
              />
              {errors.blocked_message && (
                <p className="text-sm text-red-600">
                  {errors.blocked_message.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Leave blank to use the default message.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Tax Rate */}
      <div className="space-y-2">
        <Label htmlFor="tax_rate">Tax Rate (%)</Label>
        <div className="relative">
          <Input
            id="tax_rate"
            type="number"
            step="0.1"
            placeholder="7.5"
            {...register('tax_rate', { valueAsNumber: true })}
            className={errors.tax_rate ? 'border-red-500' : ''}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            %
          </div>
        </div>
        {errors.tax_rate && (
          <p className="text-sm text-red-600">{errors.tax_rate.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Tax percentage applied to all orders (VAT/Sales Tax)
        </p>
      </div>

      {/* Payment Methods */}
      <div className="space-y-4">
        <div>
          <Label className="text-base">Accepted Payment Methods</Label>
          <p className="text-sm text-muted-foreground">
            Select which payment methods customers can use
          </p>
        </div>

        <div className="space-y-3">
          {/* Card Payment (Paystack) */}
          <div className="flex items-start space-x-3 p-4 border rounded-lg">
            <Controller
              name="accept_card"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="accept_card"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <div className="space-y-1 flex-1">
              <Label
                htmlFor="accept_card"
                className="text-sm font-medium cursor-pointer"
              >
                Card Payment (Paystack)
              </Label>
              <p className="text-xs text-muted-foreground">
                Accept payments via debit/credit cards through Paystack
              </p>
            </div>
          </div>

          {/* Cash Payment */}
          <div className="flex items-start space-x-3 p-4 border rounded-lg">
            <Controller
              name="accept_cash"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="accept_cash"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <div className="space-y-1 flex-1">
              <Label
                htmlFor="accept_cash"
                className="text-sm font-medium cursor-pointer"
              >
                Cash on Delivery
              </Label>
              <p className="text-xs text-muted-foreground">
                Allow customers to pay with cash upon delivery
              </p>
            </div>
          </div>

          {/* Bank Transfer */}
          <div className="flex items-start space-x-3 p-4 border rounded-lg">
            <Controller
              name="accept_transfer"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="accept_transfer"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <div className="space-y-1 flex-1">
              <Label
                htmlFor="accept_transfer"
                className="text-sm font-medium cursor-pointer"
              >
                Bank Transfer
              </Label>
              <p className="text-xs text-muted-foreground">
                Accept bank transfers (requires manual verification)
              </p>
            </div>
          </div>
        </div>

        {!acceptCash && !acceptCard && !acceptTransfer && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              ⚠️ At least one payment method must be selected
            </p>
          </div>
        )}
      </div>

      {/* Information Box */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <h4 className="text-sm font-medium text-blue-300 mb-2">
          Payment Gateway Configuration
        </h4>
        <p className="text-xs text-blue-800">
          Your Paystack integration is configured via environment variables. To
          update your Paystack keys, please modify your <code>.env.local</code>{' '}
          file.
        </p>
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
