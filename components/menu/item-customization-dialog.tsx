'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { Plus, Minus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useCartStore } from '@/store/cart-store';
import { formatCurrency, getDietaryTagIcon } from '@/lib/formatters';
import type { MenuItemWithDetails, ItemAddon, ItemVariationOption } from '@/types/database';
import { toast } from 'sonner';

interface ItemCustomizationDialogProps {
  item: MenuItemWithDetails;
  open: boolean;
  onClose: () => void;
}

export function ItemCustomizationDialog({ item, open, onClose }: ItemCustomizationDialogProps) {
  const addItem = useCartStore((state) => state.addItem);
  
  const [quantity, setQuantity] = useState(1);
  const [selectedVariationIndex, setSelectedVariationIndex] = useState<number | null>(null);
  const [selectedVariationOption, setSelectedVariationOption] = useState<ItemVariationOption | null>(null);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Reset when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setQuantity(1);
      setSelectedVariationIndex(null);
      setSelectedVariationOption(null);
      setSelectedAddonIds([]);
      setSpecialInstructions('');
      onClose();
    }
  };

  // Calculate total price
  const totalPrice = useMemo(() => {
    let price = item.base_price;
    
    // Add variation price adjustment
    if (selectedVariationOption) {
      price += selectedVariationOption.price_adjustment;
    }
    
    // Add selected addons
    if (item.addons) {
      const selectedAddons = item.addons.filter((addon) => 
        selectedAddonIds.includes(addon.id)
      );
      price += selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
    }
    
    return price * quantity;
  }, [item, selectedVariationOption, selectedAddonIds, quantity]);

  const handleAddToCart = () => {
    const selectedAddons = item.addons?.filter((addon) => 
      selectedAddonIds.includes(addon.id)
    ) || [];

    const variation = selectedVariationIndex !== null && item.variations
      ? {
          variation_name: item.variations[selectedVariationIndex].variation_name,
          option: selectedVariationOption!,
        }
      : undefined;

    addItem(
      item,
      quantity,
      variation,
      selectedAddons,
      specialInstructions || undefined
    );

    toast.success(`${item.name} added to cart!`);
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{item.name}</DialogTitle>
          {item.description && (
            <DialogDescription>{item.description}</DialogDescription>
          )}
        </DialogHeader>

        {/* Item Image */}
        {item.image_url && (
          <div className="relative h-64 w-full rounded-lg overflow-hidden">
            <Image
              src={item.image_url}
              alt={item.name}
              fill
              className="object-cover"
            />
          </div>
        )}

        {/* Base Price & Dietary Info */}
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold">{formatCurrency(item.base_price)}</span>
          {item.dietary_tag && item.dietary_tag !== 'none' && (
            <span className="text-sm text-muted-foreground">
              {getDietaryTagIcon(item.dietary_tag)} {item.dietary_tag.replace('_', ' ')}
            </span>
          )}
        </div>

        <Separator />

        {/* Variations */}
        {item.variations && item.variations.length > 0 && (
          <div className="space-y-4">
            {item.variations.map((variation, varIndex) => (
              <div key={variation.id}>
                <Label className="text-base font-semibold mb-3 block">
                  {variation.variation_name} <span className="text-destructive">*</span>
                </Label>
                <RadioGroup
                  value={selectedVariationIndex === varIndex ? selectedVariationOption?.name : undefined}
                  onValueChange={(value) => {
                    const option = variation.options.find((opt) => opt.name === value);
                    if (option) {
                      setSelectedVariationIndex(varIndex);
                      setSelectedVariationOption(option);
                    }
                  }}
                >
                  {variation.options.map((option) => (
                    <div key={option.name} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent">
                      <RadioGroupItem value={option.name} id={`${variation.id}-${option.name}`} />
                      <Label htmlFor={`${variation.id}-${option.name}`} className="flex-1 cursor-pointer">
                        <div className="flex justify-between items-center">
                          <span>{option.name}</span>
                          {option.price_adjustment !== 0 && (
                            <span className="text-sm text-muted-foreground">
                              {option.price_adjustment > 0 ? '+' : ''}
                              {formatCurrency(option.price_adjustment)}
                            </span>
                          )}
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            ))}
          </div>
        )}

        {/* Add-ons */}
        {item.addons && item.addons.length > 0 && (
          <div className="space-y-3">
            <Label className="text-base font-semibold">Add-ons (Optional)</Label>
            {item.addons.map((addon) => (
              <div key={addon.id} className="flex items-center space-x-2 p-3 border rounded-lg">
                <Checkbox
                  id={addon.id}
                  checked={selectedAddonIds.includes(addon.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedAddonIds([...selectedAddonIds, addon.id]);
                    } else {
                      setSelectedAddonIds(selectedAddonIds.filter((id) => id !== addon.id));
                    }
                  }}
                  disabled={!addon.is_available}
                />
                <Label htmlFor={addon.id} className="flex-1 cursor-pointer">
                  <div className="flex justify-between items-center">
                    <span className={!addon.is_available ? 'text-muted-foreground' : ''}>
                      {addon.name}
                      {!addon.is_available && ' (Unavailable)'}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      +{formatCurrency(addon.price)}
                    </span>
                  </div>
                </Label>
              </div>
            ))}
          </div>
        )}

        {/* Special Instructions */}
        <div className="space-y-2">
          <Label htmlFor="instructions">Special Instructions (Optional)</Label>
          <Textarea
            id="instructions"
            placeholder="E.g., Extra spicy, no onions..."
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            maxLength={200}
            rows={3}
          />
          <p className="text-xs text-muted-foreground text-right">
            {specialInstructions.length}/200
          </p>
        </div>

        <Separator />

        {/* Quantity Selector */}
        <div className="flex items-center justify-between">
          <Label className="text-base">Quantity</Label>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-12 text-center font-semibold text-lg">{quantity}</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setQuantity(Math.min(50, quantity + 1))}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Add to Cart Button */}
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            onClick={handleAddToCart}
            disabled={
              // Require variation selection if variations exist
              (item.variations && item.variations.length > 0 && !selectedVariationOption)
            }
            className="w-full sm:w-auto"
          >
            Add to Cart • {formatCurrency(totalPrice)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
