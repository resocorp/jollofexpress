'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
});

type FormData = z.infer<typeof paymentSettingsSchema>;

interface PaymentSettingsFormProps {
  data?: PaymentSettings & {
    accept_cash?: boolean;
    accept_card?: boolean;
    accept_transfer?: boolean;
  };
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
    },
  });

  const acceptCash = watch('accept_cash');
  const acceptCard = watch('accept_card');
  const acceptTransfer = watch('accept_transfer');

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
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">
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
