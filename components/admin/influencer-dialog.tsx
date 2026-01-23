'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateInfluencer, useUpdateInfluencer } from '@/hooks/use-influencer';
import { useUpdatePromo, useCreatePromo } from '@/hooks/use-promo';
import type { InfluencerWithPromoCode } from '@/types/database';
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
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const influencerFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^(\+234|0)[789]\d{9}$/, 'Invalid Nigerian phone number'),
  commission_type: z.enum(['percentage', 'fixed_amount']),
  commission_value: z.string()
    .transform((val) => parseFloat(val))
    .refine((val) => !isNaN(val) && val > 0, 'Must be a positive number'),
  social_handle: z.string().optional(),
  platform: z.string().optional(),
  notes: z.string().optional(),
  is_active: z.boolean().default(true),
  // Promo code fields (only for creation)
  promo_code: z.string().min(3).max(20).toUpperCase().optional().or(z.literal('')),
  promo_discount_type: z.enum(['percentage', 'fixed_amount']).optional(),
  promo_discount_value: z.string().optional()
    .transform((val) => val ? parseFloat(val) : undefined)
    .refine((val) => val === undefined || (!isNaN(val) && val > 0), 'Must be a positive number'),
  promo_max_discount: z.string().optional()
    .transform((val) => val ? parseFloat(val) : undefined),
  promo_min_order_value: z.string().optional()
    .transform((val) => val ? parseFloat(val) : undefined),
  promo_usage_limit: z.string().optional()
    .transform((val) => val ? parseInt(val) : undefined),
  promo_expiry_date: z.string().optional(),
});

type InfluencerFormData = z.infer<typeof influencerFormSchema>;

interface InfluencerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  influencer?: InfluencerWithPromoCode | null;
}

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'other', label: 'Other' },
];

export function InfluencerDialog({ open, onOpenChange, influencer }: InfluencerDialogProps) {
  const isEditing = !!influencer;
  // Handle both array (from Supabase join) and object formats
  const existingPromoCode = influencer 
    ? (Array.isArray((influencer as any).promo_codes) 
        ? (influencer as any).promo_codes[0] 
        : influencer.promo_code)
    : null;
  const hasExistingPromoCode = !!existingPromoCode;
  const createInfluencer = useCreateInfluencer();
  const updateInfluencer = useUpdateInfluencer();
  const updatePromo = useUpdatePromo();
  const createPromo = useCreatePromo();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dashboardUrl, setDashboardUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<InfluencerFormData>({
    resolver: zodResolver(influencerFormSchema),
    defaultValues: {
      commission_type: 'percentage',
      is_active: true,
      promo_discount_type: 'percentage',
    },
  });

  const commissionType = watch('commission_type');
  const promoDiscountType = watch('promo_discount_type');

  useEffect(() => {
    if (open && influencer) {
      // Get promo code data if it exists (handle both array and object formats)
      // Supabase returns promo_codes as array from join, but type uses promo_code
      const promoCode = Array.isArray((influencer as any).promo_codes) 
        ? (influencer as any).promo_codes[0] 
        : influencer.promo_code;
      
      // Format expiry date for date input (YYYY-MM-DD)
      const expiryDate = promoCode?.expiry_date 
        ? new Date(promoCode.expiry_date).toISOString().split('T')[0]
        : '';
      
      reset({
        name: influencer.name,
        email: influencer.email,
        phone: influencer.phone,
        commission_type: influencer.commission_type,
        commission_value: influencer.commission_value.toString(),
        social_handle: influencer.social_handle || '',
        platform: influencer.platform || '',
        notes: influencer.notes || '',
        is_active: influencer.is_active,
        // Populate promo code fields if they exist
        promo_code: promoCode?.code || '',
        promo_discount_type: promoCode?.discount_type || 'percentage',
        promo_discount_value: promoCode?.discount_value?.toString() || '',
        promo_max_discount: promoCode?.max_discount?.toString() || '',
        promo_min_order_value: promoCode?.min_order_value?.toString() || '',
        promo_usage_limit: promoCode?.usage_limit?.toString() || '',
        promo_expiry_date: expiryDate,
      });
      setDashboardUrl(null);
    } else if (open && !influencer) {
      reset({
        name: '',
        email: '',
        phone: '',
        commission_type: 'percentage',
        commission_value: '5',
        social_handle: '',
        platform: '',
        notes: '',
        is_active: true,
        promo_code: '',
        promo_discount_type: 'percentage',
        promo_discount_value: '10',
        promo_max_discount: '',
        promo_min_order_value: '',
        promo_usage_limit: '',
        promo_expiry_date: '',
      });
      setDashboardUrl(null);
    }
  }, [open, influencer, reset]);

  const onSubmit = async (data: InfluencerFormData) => {
    setIsSubmitting(true);
    try {
      if (isEditing && influencer) {
        // Update influencer basic info
        await updateInfluencer.mutateAsync({
          id: influencer.id,
          data: {
            name: data.name,
            email: data.email,
            phone: data.phone,
            commission_type: data.commission_type,
            commission_value: data.commission_value,
            social_handle: data.social_handle,
            platform: data.platform,
            notes: data.notes,
            is_active: data.is_active,
          },
        });

        // Handle promo code update/creation
        const promoExpiryDate = data.promo_expiry_date
          ? new Date(data.promo_expiry_date + 'T23:59:59').toISOString()
          : undefined;

        // Get existing promo code (handle both array and object formats)
        const existingPromoCode = Array.isArray((influencer as any).promo_codes) 
          ? (influencer as any).promo_codes[0] 
          : influencer.promo_code;

        if (existingPromoCode && data.promo_discount_value) {
          // Update existing promo code
          await updatePromo.mutateAsync({
            id: existingPromoCode.id,
            data: {
              discount_type: data.promo_discount_type,
              discount_value: data.promo_discount_value,
              max_discount: data.promo_max_discount || undefined,
              min_order_value: data.promo_min_order_value || undefined,
              usage_limit: data.promo_usage_limit || undefined,
              expiry_date: promoExpiryDate || undefined,
            },
          });
        } else if (!existingPromoCode && data.promo_code && data.promo_discount_value) {
          // Create new promo code for existing influencer
          await createPromo.mutateAsync({
            code: data.promo_code,
            description: `Influencer code for ${data.name}`,
            discount_type: data.promo_discount_type,
            discount_value: data.promo_discount_value,
            max_discount: data.promo_max_discount,
            min_order_value: data.promo_min_order_value,
            usage_limit: data.promo_usage_limit,
            expiry_date: promoExpiryDate,
            influencer_id: influencer.id,
            is_active: true,
          });
        }

        toast.success('Influencer updated successfully');
        onOpenChange(false);
      } else {
        const promoExpiryDate = data.promo_expiry_date
          ? new Date(data.promo_expiry_date + 'T23:59:59').toISOString()
          : undefined;

        const result = await createInfluencer.mutateAsync({
          name: data.name,
          email: data.email,
          phone: data.phone,
          commission_type: data.commission_type,
          commission_value: data.commission_value,
          social_handle: data.social_handle,
          platform: data.platform,
          notes: data.notes,
          is_active: data.is_active,
          promo_code: data.promo_code || undefined,
          promo_discount_type: data.promo_code ? data.promo_discount_type : undefined,
          promo_discount_value: data.promo_code ? data.promo_discount_value : undefined,
          promo_max_discount: data.promo_code ? data.promo_max_discount : undefined,
          promo_min_order_value: data.promo_code ? data.promo_min_order_value : undefined,
          promo_usage_limit: data.promo_code ? data.promo_usage_limit : undefined,
          promo_expiry_date: data.promo_code ? promoExpiryDate : undefined,
        });

        if ((result as any).dashboard_url) {
          setDashboardUrl((result as any).dashboard_url);
          toast.success('Influencer created! Share the dashboard URL with them.');
        } else {
          toast.success('Influencer created successfully');
          onOpenChange(false);
        }
      }
    } catch (error: any) {
      console.error('Error saving influencer:', error);
      toast.error(error.message || 'Failed to save influencer');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If we have a dashboard URL, show success screen
  if (dashboardUrl) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Influencer Created!</DialogTitle>
            <DialogDescription>
              Share this dashboard URL with the influencer so they can track their performance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 mb-2 font-medium">Dashboard URL:</p>
              <code className="text-xs bg-white p-2 rounded block break-all">
                {dashboardUrl}
              </code>
            </div>
            <p className="text-sm text-muted-foreground">
              This URL contains their access token. Keep it safe and share it only with the influencer.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(dashboardUrl);
                toast.success('URL copied to clipboard');
              }}
            >
              Copy URL
            </Button>
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Influencer' : 'Add Influencer'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the influencer details below'
              : 'Create a new influencer with their promo code'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Basic Information</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="John Doe"
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="john@example.com"
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  placeholder="08012345678"
                  className={errors.phone ? 'border-destructive' : ''}
                />
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="platform">Platform</Label>
                <Select
                  value={watch('platform') || ''}
                  onValueChange={(value) => setValue('platform', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="social_handle">Social Handle</Label>
                <Input
                  id="social_handle"
                  {...register('social_handle')}
                  placeholder="@johndoe"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Commission Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Commission Settings</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Commission Type *</Label>
                <Select
                  value={commissionType}
                  onValueChange={(value: 'percentage' | 'fixed_amount') =>
                    setValue('commission_type', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed_amount">Fixed Amount (₦)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="commission_value">
                  Commission Value *
                </Label>
                <Input
                  id="commission_value"
                  type="number"
                  step={commissionType === 'percentage' ? '0.1' : '1'}
                  {...register('commission_value')}
                  placeholder={commissionType === 'percentage' ? '5' : '500'}
                />
                <p className="text-xs text-muted-foreground">
                  {commissionType === 'percentage'
                    ? 'Percentage of each order total'
                    : 'Fixed amount per order in Naira'}
                </p>
                {errors.commission_value && (
                  <p className="text-sm text-destructive">{errors.commission_value.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Promo Code Settings */}
          <Separator />
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">
              {isEditing && hasExistingPromoCode ? 'Promo Code Settings' : 'Promo Code (Optional)'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isEditing && hasExistingPromoCode
                ? 'Update promo code settings - changes will apply to future orders'
                : 'Create a promo code for this influencer to share with their audience'}
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="promo_code">Promo Code</Label>
                <Input
                  id="promo_code"
                  {...register('promo_code')}
                  placeholder="JOHN10"
                  className="uppercase"
                  disabled={isEditing && hasExistingPromoCode}
                />
                {isEditing && hasExistingPromoCode && (
                  <p className="text-xs text-muted-foreground">
                    Promo code cannot be changed after creation
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Discount Type</Label>
                <Select
                  value={promoDiscountType || 'percentage'}
                  onValueChange={(value: 'percentage' | 'fixed_amount') =>
                    setValue('promo_discount_type', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed_amount">Fixed Amount (₦)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="promo_discount_value">Discount Value</Label>
                <Input
                  id="promo_discount_value"
                  type="number"
                  {...register('promo_discount_value')}
                  placeholder="10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="promo_max_discount">Max Discount (for %)</Label>
                <Input
                  id="promo_max_discount"
                  type="number"
                  {...register('promo_max_discount')}
                  placeholder="1000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="promo_usage_limit">Usage Limit</Label>
                <Input
                  id="promo_usage_limit"
                  type="number"
                  {...register('promo_usage_limit')}
                  placeholder="100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="promo_expiry_date">Expiry Date</Label>
                <Input
                  id="promo_expiry_date"
                  type="date"
                  {...register('promo_expiry_date')}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Notes & Status */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder="Any additional notes about this influencer..."
                rows={2}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={watch('is_active')}
                onCheckedChange={(checked) => setValue('is_active', checked)}
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                Active (can earn commissions)
              </Label>
            </div>
          </div>

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
              {isEditing ? 'Update' : 'Create'} Influencer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
