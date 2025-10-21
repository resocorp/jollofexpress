'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateSettings } from '@/hooks/use-settings';
import { toast } from 'sonner';
import { Loader2, Upload, X } from 'lucide-react';
import { uploadMenuItemImage, deleteMenuItemImage, validateImageFile } from '@/lib/image-upload';
import type { RestaurantInfo } from '@/types/database';

const restaurantInfoSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: z.string().min(10, 'Phone number is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().min(5, 'Address is required'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional().or(z.literal('')),
});

type FormData = z.infer<typeof restaurantInfoSchema>;

interface RestaurantInfoFormProps {
  data?: RestaurantInfo;
}

export function RestaurantInfoForm({ data }: RestaurantInfoFormProps) {
  const updateSettings = useUpdateSettings();
  const [logoUrl, setLogoUrl] = useState(data?.logo_url || '');
  const [bannerUrl, setBannerUrl] = useState(data?.banner_url || '');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(restaurantInfoSchema),
    defaultValues: {
      name: data?.name || '',
      phone: data?.phone || '',
      email: data?.email || '',
      address: data?.address || '',
      description: data?.description || '',
    },
  });

  const handleImageUpload = async (
    file: File,
    type: 'logo' | 'banner'
  ) => {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    const setUploading = type === 'logo' ? setIsUploadingLogo : setIsUploadingBanner;
    const setUrl = type === 'logo' ? setLogoUrl : setBannerUrl;

    try {
      setUploading(true);
      const result = await uploadMenuItemImage(file, `restaurant-${type}`);
      setUrl(result.publicUrl);
      toast.success(`${type === 'logo' ? 'Logo' : 'Banner'} uploaded successfully`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Failed to upload ${type}`);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async (type: 'logo' | 'banner') => {
    const url = type === 'logo' ? logoUrl : bannerUrl;
    const setUrl = type === 'logo' ? setLogoUrl : setBannerUrl;

    if (!url) return;

    try {
      // Extract path from URL if it's from Supabase
      if (url.includes('supabase')) {
        const path = url.split('/').pop();
        if (path) {
          await deleteMenuItemImage(path);
        }
      }
      setUrl('');
      toast.success(`${type === 'logo' ? 'Logo' : 'Banner'} removed`);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(`Failed to remove ${type}`);
    }
  };

  const onSubmit = async (formData: FormData) => {
    try {
      await updateSettings.mutateAsync({
        key: 'restaurant_info',
        value: {
          ...formData,
          logo_url: logoUrl,
          banner_url: bannerUrl,
        },
      });
      toast.success('Restaurant information updated successfully');
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update restaurant information');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">Restaurant Name *</Label>
          <Input
            id="name"
            placeholder="JollofExpress"
            {...register('name')}
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && (
            <p className="text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number *</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+234 XXX XXX XXXX"
            {...register('phone')}
            className={errors.phone ? 'border-red-500' : ''}
          />
          {errors.phone && (
            <p className="text-sm text-red-600">{errors.phone.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email (Optional)</Label>
          <Input
            id="email"
            type="email"
            placeholder="info@jollofexpress.com"
            {...register('email')}
            className={errors.email ? 'border-red-500' : ''}
          />
          {errors.email && (
            <p className="text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Address *</Label>
          <Input
            id="address"
            placeholder="123 Main Street, Awka"
            {...register('address')}
            className={errors.address ? 'border-red-500' : ''}
          />
          {errors.address && (
            <p className="text-sm text-red-600">{errors.address.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          placeholder="Delicious Nigerian cuisine delivered to your doorstep"
          rows={3}
          maxLength={500}
          {...register('description')}
          className={errors.description ? 'border-red-500' : ''}
        />
        {errors.description && (
          <p className="text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      {/* Logo Upload */}
      <div className="space-y-2">
        <Label>Restaurant Logo</Label>
        <div className="flex items-center gap-4">
          {logoUrl ? (
            <div className="relative">
              <img
                src={logoUrl}
                alt="Logo"
                className="h-24 w-24 object-cover rounded-lg border"
              />
              <button
                type="button"
                onClick={() => handleRemoveImage('logo')}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="h-24 w-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-gray-50">
              <Upload className="h-6 w-6 text-gray-400" />
            </div>
          )}
          <div className="flex-1">
            <Input
              type="file"
              accept="image/*"
              disabled={isUploadingLogo}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file, 'logo');
              }}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Recommended: Square image, max 5MB
            </p>
          </div>
          {isUploadingLogo && <Loader2 className="h-5 w-5 animate-spin" />}
        </div>
      </div>

      {/* Banner Upload */}
      <div className="space-y-2">
        <Label>Restaurant Banner</Label>
        <div className="flex items-start gap-4">
          {bannerUrl ? (
            <div className="relative">
              <img
                src={bannerUrl}
                alt="Banner"
                className="h-32 w-48 object-cover rounded-lg border"
              />
              <button
                type="button"
                onClick={() => handleRemoveImage('banner')}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="h-32 w-48 border-2 border-dashed rounded-lg flex items-center justify-center bg-gray-50">
              <Upload className="h-6 w-6 text-gray-400" />
            </div>
          )}
          <div className="flex-1">
            <Input
              type="file"
              accept="image/*"
              disabled={isUploadingBanner}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file, 'banner');
              }}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Recommended: 16:9 aspect ratio, max 5MB
            </p>
          </div>
          {isUploadingBanner && <Loader2 className="h-5 w-5 animate-spin" />}
        </div>
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
