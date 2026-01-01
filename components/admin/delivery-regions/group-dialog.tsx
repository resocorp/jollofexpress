'use client';

import { useEffect } from 'react';
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
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateRegionGroup, useUpdateRegionGroup } from '@/hooks/use-delivery-regions';
import type { DeliveryRegionGroup } from '@/types/database';

const groupSchema = z.object({
  name: z.string().min(1, 'Group name is required'),
  description: z.string().optional(),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof groupSchema>;

interface GroupDialogProps {
  open: boolean;
  onClose: () => void;
  group: DeliveryRegionGroup | null;
}

export function GroupDialog({ open, onClose, group }: GroupDialogProps) {
  const createGroup = useCreateRegionGroup();
  const updateGroup = useUpdateRegionGroup();
  const isEditing = !!group;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: '',
      description: '',
      is_active: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (group) {
        reset({
          name: group.name,
          description: group.description || '',
          is_active: group.is_active,
        });
      } else {
        reset({
          name: '',
          description: '',
          is_active: true,
        });
      }
    }
  }, [open, group, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        name: data.name,
        description: data.description || undefined,
        is_active: data.is_active,
      };

      if (isEditing && group) {
        await updateGroup.mutateAsync({ id: group.id, ...payload });
        toast.success('Group updated successfully');
      } else {
        await createGroup.mutateAsync(payload);
        toast.success('Group created successfully');
      }
      onClose();
    } catch (error: any) {
      console.error('Error saving group:', error);
      toast.error(error?.message || 'Failed to save group');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Group' : 'Add New Group'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the region group details.' : 'Create a new group to organize delivery regions.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Group Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Group Name *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="e.g., Near, Medium, Far"
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
              placeholder="Brief description of this group"
              rows={2}
            />
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="space-y-0.5">
              <Label>Active</Label>
              <p className="text-sm text-muted-foreground">
                Inactive groups won't show in checkout
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
                'Update Group'
              ) : (
                'Create Group'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
