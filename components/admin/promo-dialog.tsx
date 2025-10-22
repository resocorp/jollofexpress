'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreatePromo, useUpdatePromo } from '@/hooks/use-promo';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/formatters';
import type { PromoCode } from '@/types/database';

const promoFormSchema = z.object({
  code: z.string()
    .min(3, 'Code must be at least 3 characters')
    .max(20, 'Code must be at most 20 characters')
    .regex(/^[A-Z0-9]+$/, 'Code must contain only uppercase letters and numbers')
    .transform((val) => val.toUpperCase()),
  description: z.string().max(200, 'Description must be at most 200 characters').optional(),
  discount_type: z.enum(['percentage', 'fixed_amount']),
  discount_value: z.string()
    .transform((val) => parseFloat(val))
    .refine((val) => !isNaN(val) && val > 0, 'Must be a positive number'),
  max_discount: z.string().optional()
    .transform((val) => val ? parseFloat(val) : undefined)
    .refine((val) => val === undefined || (!isNaN(val) && val > 0), 'Must be a positive number'),
  min_order_value: z.string().optional()
    .transform((val) => val ? parseFloat(val) : undefined)
    .refine((val) => val === undefined || (!isNaN(val) && val >= 0), 'Must be 0 or greater'),
  usage_limit: z.string().optional()
    .transform((val) => val ? parseInt(val) : undefined)
    .refine((val) => val === undefined || (!isNaN(val) && val > 0), 'Must be a positive integer'),
  expiry_date: z.string().optional(),
  is_active: z.boolean().default(true),
});

type PromoFormData = z.infer<typeof promoFormSchema>;

interface PromoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promo?: PromoCode | null;
}

export function PromoDialog({ open, onOpenChange, promo }: PromoDialogProps) {
  const isEditing = !!promo;
  const createPromo = useCreatePromo();
  const updatePromo = useUpdatePromo();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PromoFormData>({
    resolver: zodResolver(promoFormSchema),
    defaultValues: {
      discount_type: 'percentage',
      is_active: true,
    },
  });

  const discountType = watch('discount_type');
  const discountValue = watch('discount_value');
  const maxDiscount = watch('max_discount');

  // Reset form when dialog opens/closes or promo changes
  useEffect(() => {
    if (open && promo) {
      reset({
        code: promo.code,
        description: promo.description || '',
        discount_type: promo.discount_type,
        discount_value: promo.discount_value.toString(),
        max_discount: promo.max_discount?.toString() || '',
        min_order_value: promo.min_order_value?.toString() || '',
        usage_limit: promo.usage_limit?.toString() || '',
        expiry_date: promo.expiry_date ? new Date(promo.expiry_date).toISOString().split('T')[0] : '',
        is_active: promo.is_active,
      });
    } else if (open && !promo) {
      reset({
        code: '',
        description: '',
        discount_type: 'percentage',
        discount_value: '',
        max_discount: '',
        min_order_value: '',
        usage_limit: '',
        expiry_date: '',
        is_active: true,
      });
    }
  }, [open, promo, reset]);

  const onSubmit = async (data: PromoFormData) => {
    setIsSubmitting(true);
    try {
      // Convert expiry_date to ISO datetime string if provided
      const expiryDateTime = data.expiry_date 
        ? new Date(data.expiry_date + 'T23:59:59').toISOString()
        : undefined;

      const promoData = {
        code: data.code,
        description: data.description || undefined,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        max_discount: data.max_discount,
        min_order_value: data.min_order_value,
        usage_limit: data.usage_limit,
        expiry_date: expiryDateTime,
        is_active: data.is_active,
      };

      if (isEditing && promo) {
        await updatePromo.mutateAsync({ id: promo.id, data: promoData });
        toast.success('Promo code updated successfully');
      } else {
        await createPromo.mutateAsync(promoData);
        toast.success('Promo code created successfully');
      }

      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving promo:', error);
      toast.error(error.message || 'Failed to save promo code');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate preview discount
  const getDiscountPreview = () => {
    if (!discountValue) return null;
    
    const sampleOrder = 10000; // ₦10,000 sample order
    let discount = 0;

    if (discountType === 'percentage') {
      discount = (sampleOrder * parseFloat(discountValue.toString())) / 100;
      if (maxDiscount && discount > parseFloat(maxDiscount.toString())) {
        discount = parseFloat(maxDiscount.toString());
      }
    } else {
      discount = parseFloat(discountValue.toString());
    }

    return {
      original: sampleOrder,
      discount,
      final: sampleOrder - discount,
    };
  };

  const preview = getDiscountPreview();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Promo Code' : 'Create Promo Code'}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the promo code details below'
              : 'Create a new promotional discount code for customers'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Basic Information</h3>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="code">
                  Promo Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="code"
                  {...register('code')}
                  placeholder="WELCOME10"
                  className={errors.code ? 'border-destructive' : ''}
                  disabled={isEditing && promo && promo.used_count > 0}
                />
                {errors.code && (
                  <p className="text-sm text-destructive">{errors.code.message}</p>
                )}
                {isEditing && promo && promo.used_count > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Code cannot be changed after being used
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="discount_type">
                  Discount Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={discountType}
                  onValueChange={(value: 'percentage' | 'fixed_amount') => 
                    setValue('discount_type', value)
                  }
                >
                  <SelectTrigger id="discount_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed_amount">Fixed Amount (₦)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="New customer welcome discount"
                rows={2}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Discount Configuration */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Discount Configuration</h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="discount_value">
                  Discount Value <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="discount_value"
                  type="number"
                  step={discountType === 'percentage' ? '0.01' : '1'}
                  {...register('discount_value')}
                  placeholder={discountType === 'percentage' ? '10' : '1000'}
                  className={errors.discount_value ? 'border-destructive' : ''}
                />
                <p className="text-xs text-muted-foreground">
                  {discountType === 'percentage' ? 'Percentage discount (e.g., 10 for 10%)' : 'Fixed amount in Naira'}
                </p>
                {errors.discount_value && (
                  <p className="text-sm text-destructive">{errors.discount_value.message}</p>
                )}
              </div>

              {discountType === 'percentage' && (
                <div className="space-y-2">
                  <Label htmlFor="max_discount">Max Discount Amount (Optional)</Label>
                  <Input
                    id="max_discount"
                    type="number"
                    step="1"
                    {...register('max_discount')}
                    placeholder="5000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Cap the maximum discount amount
                  </p>
                  {errors.max_discount && (
                    <p className="text-sm text-destructive">{errors.max_discount.message}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="min_order_value">Min Order Value (Optional)</Label>
                <Input
                  id="min_order_value"
                  type="number"
                  step="1"
                  {...register('min_order_value')}
                  placeholder="1000"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum order value required
                </p>
                {errors.min_order_value && (
                  <p className="text-sm text-destructive">{errors.min_order_value.message}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Usage & Expiry */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Usage & Expiry</h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="usage_limit">Usage Limit (Optional)</Label>
                <Input
                  id="usage_limit"
                  type="number"
                  step="1"
                  {...register('usage_limit')}
                  placeholder="100"
                />
                <p className="text-xs text-muted-foreground">
                  Max number of times this code can be used
                </p>
                {errors.usage_limit && (
                  <p className="text-sm text-destructive">{errors.usage_limit.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiry_date">Expiry Date (Optional)</Label>
                <Input
                  id="expiry_date"
                  type="date"
                  {...register('expiry_date')}
                  min={new Date().toISOString().split('T')[0]}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty for no expiry
                </p>
                {errors.expiry_date && (
                  <p className="text-sm text-destructive">{errors.expiry_date.message}</p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={watch('is_active')}
                onCheckedChange={(checked) => setValue('is_active', checked)}
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                Active (customers can use this code)
              </Label>
            </div>
          </div>

          {/* Preview */}
          {preview && (
            <>
              <Separator />
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Example:</strong> For an order of {formatCurrency(preview.original)}, 
                  this promo will give a discount of {formatCurrency(preview.discount)}, 
                  bringing the total to {formatCurrency(preview.final)}.
                </AlertDescription>
              </Alert>
            </>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update' : 'Create'} Promo Code
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
