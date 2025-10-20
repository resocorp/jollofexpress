'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useRestaurantStatus, useUpdateRestaurantStatus } from '@/hooks/use-settings';
import { useMenu, useToggleItemAvailability } from '@/hooks/use-menu';
import { toast } from 'sonner';
import { Clock, Power, Loader2 } from 'lucide-react';

interface KitchenControlsProps {
  onClose: () => void;
}

export function KitchenControls({ onClose }: KitchenControlsProps) {
  const { data: status } = useRestaurantStatus();
  const { data: menu } = useMenu();
  const updateStatus = useUpdateRestaurantStatus();
  const toggleAvailability = useToggleItemAvailability();

  const [isOpen, setIsOpen] = useState(status?.is_open || false);
  const [prepTime, setPrepTime] = useState(status?.estimated_prep_time || 30);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateStatus = async () => {
    setIsUpdating(true);
    try {
      await updateStatus.mutateAsync({
        is_open: isOpen,
        prep_time: prepTime,
      });
      toast.success('Restaurant status updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleItem = async (itemId: string, currentAvailability: boolean) => {
    try {
      await toggleAvailability.mutateAsync({
        id: itemId,
        is_available: !currentAvailability,
      });
      toast.success(!currentAvailability ? 'Item marked available' : 'Item marked sold out');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update item');
    }
  };

  return (
    <div className="space-y-6">
      <DialogHeader>
        <DialogTitle>Kitchen Controls</DialogTitle>
        <DialogDescription>
          Manage restaurant status and menu availability
        </DialogDescription>
      </DialogHeader>

      {/* Restaurant Status */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Power className="h-5 w-5" />
            <Label htmlFor="restaurant-status" className="text-base font-semibold">
              Restaurant Status
            </Label>
          </div>
          <Switch
            id="restaurant-status"
            checked={isOpen}
            onCheckedChange={setIsOpen}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {isOpen ? 'Accepting new orders' : 'Not accepting new orders'}
        </p>
      </div>

      {/* Prep Time */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          <Label htmlFor="prep-time" className="text-base font-semibold">
            Estimated Prep Time (minutes)
          </Label>
        </div>
        <Input
          id="prep-time"
          type="number"
          min="10"
          max="120"
          value={prepTime}
          onChange={(e) => setPrepTime(parseInt(e.target.value) || 30)}
        />
        <p className="text-sm text-muted-foreground">
          Customers will see this as the wait time
        </p>
      </div>

      {/* Save Button */}
      <Button
        onClick={handleUpdateStatus}
        disabled={isUpdating}
        className="w-full"
      >
        {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Save Changes
      </Button>

      <Separator />

      {/* Menu Items Availability */}
      <div>
        <h3 className="text-base font-semibold mb-3">Menu Items</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Mark items as sold out when ingredients run out
        </p>

        <div className="max-h-[400px] overflow-y-auto space-y-4">
          {menu?.categories.map((category) => (
            <div key={category.id}>
              <h4 className="font-medium text-sm text-muted-foreground mb-2">
                {category.name}
              </h4>
              <div className="space-y-2">
                {category.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 border rounded-lg"
                  >
                    <span className={`text-sm ${!item.is_available ? 'text-muted-foreground line-through' : ''}`}>
                      {item.name}
                    </span>
                    <Switch
                      checked={item.is_available}
                      onCheckedChange={() => handleToggleItem(item.id, item.is_available)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
