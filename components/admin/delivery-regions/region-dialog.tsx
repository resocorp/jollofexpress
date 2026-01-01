'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, MapPin, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateDeliveryRegion, useUpdateDeliveryRegion } from '@/hooks/use-delivery-regions';
import { PolygonMapEditor, type GeoJSONPolygon } from './polygon-map-editor';
import type { DeliveryRegion, DeliveryRegionGroup } from '@/types/database';

const regionSchema = z.object({
  name: z.string().min(1, 'Region name is required'),
  description: z.string().optional(),
  group_id: z.string().optional(),
  delivery_fee: z.number().min(0, 'Delivery fee must be 0 or greater'),
  free_delivery_threshold: z.number().min(0).nullable().optional(),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof regionSchema>;

interface RegionDialogProps {
  open: boolean;
  onClose: () => void;
  region: DeliveryRegion | null;
  groups: DeliveryRegionGroup[];
}

export function RegionDialog({ open, onClose, region, groups }: RegionDialogProps) {
  const createRegion = useCreateDeliveryRegion();
  const updateRegion = useUpdateDeliveryRegion();
  const isEditing = !!region;
  const [activeTab, setActiveTab] = useState('details');
  const [geofenceCoordinates, setGeofenceCoordinates] = useState<GeoJSONPolygon | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(regionSchema),
    defaultValues: {
      name: '',
      description: '',
      group_id: '',
      delivery_fee: 1000,
      free_delivery_threshold: null,
      is_active: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (region) {
        reset({
          name: region.name,
          description: region.description || '',
          group_id: region.group_id || '',
          delivery_fee: region.delivery_fee,
          free_delivery_threshold: region.free_delivery_threshold || null,
          is_active: region.is_active,
        });
        // Load existing geofence coordinates (safely cast from database JSONB)
        const coords = region.geofence_coordinates as unknown;
        if (coords && typeof coords === 'object' && 'type' in coords && 'coordinates' in coords) {
          const geoJson = coords as { type: string; coordinates: number[][][] };
          if (geoJson.type === 'Polygon' && Array.isArray(geoJson.coordinates)) {
            setGeofenceCoordinates(geoJson as GeoJSONPolygon);
          } else {
            setGeofenceCoordinates(null);
          }
        } else {
          setGeofenceCoordinates(null);
        }
      } else {
        reset({
          name: '',
          description: '',
          group_id: '',
          delivery_fee: 1000,
          free_delivery_threshold: null,
          is_active: true,
        });
        setGeofenceCoordinates(null);
      }
      setActiveTab('details');
    }
  }, [open, region, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        name: data.name,
        description: data.description || undefined,
        group_id: data.group_id || null,
        delivery_fee: data.delivery_fee,
        free_delivery_threshold: data.free_delivery_threshold || null,
        is_active: data.is_active,
        geofence_coordinates: geofenceCoordinates,
      };

      if (isEditing && region) {
        await updateRegion.mutateAsync({ id: region.id, ...payload });
        toast.success('Region updated successfully');
      } else {
        await createRegion.mutateAsync(payload);
        toast.success('Region created successfully');
      }
      onClose();
    } catch (error: any) {
      console.error('Error saving region:', error);
      toast.error(error?.message || 'Failed to save region');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Region' : 'Add New Region'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the delivery region details and zone.' : 'Create a new delivery region with pricing and zone.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Details & Pricing
              </TabsTrigger>
              <TabsTrigger value="zone" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Delivery Zone
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
          {/* Region Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Region Name *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="e.g., Aroma, Tempsite, Regina Axis"
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Brief description of this region"
              rows={2}
            />
          </div>

          {/* Group Selection */}
          <div className="space-y-2">
            <Label htmlFor="group_id">Region Group</Label>
            <Controller
              name="group_id"
              control={control}
              render={({ field }) => (
                <Select 
                  value={field.value || 'none'} 
                  onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a group (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Group</SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Delivery Fee */}
          <div className="space-y-2">
            <Label htmlFor="delivery_fee">Delivery Fee (₦) *</Label>
            <Input
              id="delivery_fee"
              type="number"
              step="100"
              {...register('delivery_fee', { valueAsNumber: true })}
              placeholder="1000"
              className={errors.delivery_fee ? 'border-destructive' : ''}
            />
            {errors.delivery_fee && (
              <p className="text-sm text-destructive">{errors.delivery_fee.message}</p>
            )}
          </div>

          {/* Free Delivery Threshold */}
          <div className="space-y-2">
            <Label htmlFor="free_delivery_threshold">Free Delivery Threshold (₦)</Label>
            <Input
              id="free_delivery_threshold"
              type="number"
              step="1000"
              {...register('free_delivery_threshold', { 
                setValueAs: (v) => v === '' ? null : Number(v),
              })}
              placeholder="15000 (leave empty for no free delivery)"
            />
            <p className="text-xs text-muted-foreground">
              Orders above this amount get free delivery. Leave empty to disable.
            </p>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="space-y-0.5">
              <Label>Active</Label>
              <p className="text-sm text-muted-foreground">
                Inactive regions won't appear in checkout
              </p>
            </div>
            <Controller
              name="is_active"
              control={control}
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>
            </TabsContent>

            <TabsContent value="zone" className="mt-4">
              <PolygonMapEditor
                initialPolygon={geofenceCoordinates}
                onPolygonChange={setGeofenceCoordinates}
              />
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                'Update Region'
              ) : (
                'Create Region'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
