'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useUpdateSettings } from '@/hooks/use-settings';
import { toast } from 'sonner';
import { Loader2, Plus, X } from 'lucide-react';
import type { DeliverySettings } from '@/types/database';

const deliverySettingsSchema = z.object({
  enabled: z.boolean(),
  min_order: z.number().min(0, 'Minimum order must be 0 or greater'),
  delivery_fee: z.number().min(0, 'Delivery fee must be 0 or greater'),
});

type FormData = z.infer<typeof deliverySettingsSchema>;

interface DeliverySettingsFormProps {
  data?: DeliverySettings;
}

export function DeliverySettingsForm({ data }: DeliverySettingsFormProps) {
  const updateSettings = useUpdateSettings();
  const [cities, setCities] = useState<string[]>(data?.cities || ['Awka']);
  const [newCity, setNewCity] = useState('');

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(deliverySettingsSchema),
    defaultValues: {
      enabled: data?.enabled ?? true,
      min_order: data?.min_order || 500,
      delivery_fee: data?.delivery_fee || 200,
    },
  });

  const isEnabled = watch('enabled');

  const handleAddCity = () => {
    const trimmedCity = newCity.trim();
    if (!trimmedCity) {
      toast.error('Please enter a city name');
      return;
    }
    if (cities.some((c) => c.toLowerCase() === trimmedCity.toLowerCase())) {
      toast.error('This city is already in the list');
      return;
    }
    setCities([...cities, trimmedCity]);
    setNewCity('');
    toast.success(`${trimmedCity} added to delivery cities`);
  };

  const handleRemoveCity = (cityToRemove: string) => {
    if (cities.length <= 1) {
      toast.error('You must have at least one delivery city');
      return;
    }
    setCities(cities.filter((city) => city !== cityToRemove));
    toast.success(`${cityToRemove} removed from delivery cities`);
  };

  const onSubmit = async (formData: FormData) => {
    if (formData.enabled && cities.length === 0) {
      toast.error('Please add at least one delivery city');
      return;
    }

    try {
      console.log('Submitting delivery settings:', { ...formData, cities });
      await updateSettings.mutateAsync({
        key: 'delivery_settings',
        value: {
          ...formData,
          cities,
        },
      });
      toast.success('Delivery settings updated successfully');
    } catch (error: any) {
      console.error('Update error:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to update delivery settings';
      const errorDetails = error?.response?.data?.details;
      
      toast.error(errorMessage);
      if (errorDetails) {
        console.error('Error details:', errorDetails);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Enable/Disable Delivery */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="space-y-0.5">
          <Label className="text-base">Enable Delivery Service</Label>
          <p className="text-sm text-muted-foreground">
            Allow customers to order for delivery
          </p>
        </div>
        <Controller
          name="enabled"
          control={control}
          render={({ field }) => (
            <Switch
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </div>

      {isEnabled && (
        <>
          {/* Delivery Cities */}
          <div className="space-y-4">
            <div>
              <Label className="text-base">Delivery Cities</Label>
              <p className="text-sm text-muted-foreground">
                Add cities where you offer delivery service
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {cities.map((city) => (
                <div
                  key={city}
                  className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-full"
                >
                  <span className="text-sm font-medium text-orange-700">
                    {city}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCity(city)}
                    className="text-orange-600 hover:text-orange-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Enter city name"
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCity();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddCity}
                className="flex-shrink-0"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add City
              </Button>
            </div>
          </div>

          {/* Minimum Order */}
          <div className="space-y-2">
            <Label htmlFor="min_order">Minimum Order Amount (₦)</Label>
            <Input
              id="min_order"
              type="number"
              step="50"
              placeholder="500"
              {...register('min_order', { valueAsNumber: true })}
              className={errors.min_order ? 'border-red-500' : ''}
            />
            {errors.min_order && (
              <p className="text-sm text-red-600">{errors.min_order.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Customers must order at least this amount for delivery
            </p>
          </div>

          {/* Delivery Fee */}
          <div className="space-y-2">
            <Label htmlFor="delivery_fee">Standard Delivery Fee (₦)</Label>
            <Input
              id="delivery_fee"
              type="number"
              step="50"
              placeholder="200"
              {...register('delivery_fee', { valueAsNumber: true })}
              className={errors.delivery_fee ? 'border-red-500' : ''}
            />
            {errors.delivery_fee && (
              <p className="text-sm text-red-600">
                {errors.delivery_fee.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Flat delivery fee applied to all orders
            </p>
          </div>
        </>
      )}

      {!isEnabled && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            Delivery service is currently disabled. Customers will only be able
            to place carryout orders.
          </p>
        </div>
      )}

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
