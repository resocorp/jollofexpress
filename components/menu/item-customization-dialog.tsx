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
  const [variationQuantity, setVariationQuantity] = useState(1);
  const [selectedAddonQuantities, setSelectedAddonQuantities] = useState<Record<string, number>>({});

  // Reset when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setQuantity(1);
      setSelectedVariationIndex(null);
      setSelectedVariationOption(null);
      setVariationQuantity(1);
      setSelectedAddonQuantities({});
      onClose();
    }
  };

  // Calculate total price
  const totalPrice = useMemo(() => {
    let price = item.base_price;
    
    // Add variation price adjustment (multiplied by variation quantity)
    if (selectedVariationOption) {
      price += selectedVariationOption.price_adjustment * variationQuantity;
    }
    
    // Add selected addons (each with their own quantity)
    if (item.addons) {
      const addonsTotal = Object.entries(selectedAddonQuantities).reduce((sum, [addonId, qty]) => {
        const addon = item.addons?.find(a => a.id === addonId);
        return sum + (addon ? addon.price * qty : 0);
      }, 0);
      price += addonsTotal;
    }
    
    return price * quantity;
  }, [item, selectedVariationOption, variationQuantity, selectedAddonQuantities, quantity]);

  const handleAddToCart = () => {
    const selectedAddons = Object.entries(selectedAddonQuantities)
      .map(([addonId, qty]) => {
        const addon = item.addons?.find(a => a.id === addonId);
        return addon ? { ...addon, quantity: qty } : null;
      })
      .filter((addon): addon is ItemAddon & { quantity: number } => addon !== null);

    const variation = selectedVariationIndex !== null && item.variations
      ? {
          variation_name: item.variations[selectedVariationIndex].variation_name,
          option: selectedVariationOption!,
          quantity: selectedVariationOption!.price_adjustment !== 0 ? variationQuantity : undefined,
        }
      : undefined;

    addItem(
      item,
      quantity,
      variation,
      selectedAddons
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
                      setVariationQuantity(1); // Reset quantity when changing selection
                    }
                  }}
                >
                  {variation.options.map((option) => (
                    <div key={option.name} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent">
                      <RadioGroupItem value={option.name} id={`${variation.id}-${option.name}`} />
                      <Label htmlFor={`${variation.id}-${option.name}`} className="flex-1 cursor-pointer">
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <span>{option.name}</span>
                            {option.price_adjustment !== 0 && (
                              <span className="text-sm text-muted-foreground ml-2">
                                {option.price_adjustment > 0 ? '+' : ''}
                                {formatCurrency(option.price_adjustment)}
                              </span>
                            )}
                          </div>
                          {selectedVariationIndex === varIndex && selectedVariationOption?.name === option.name && option.price_adjustment !== 0 && (
                            <div className="flex items-center gap-2 ml-4" onClick={(e) => e.preventDefault()}>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setVariationQuantity(Math.max(1, variationQuantity - 1));
                                }}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center font-medium text-sm">{variationQuantity}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setVariationQuantity(Math.min(50, variationQuantity + 1));
                                }}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
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
            {item.addons.map((addon) => {
              const addonQty = selectedAddonQuantities[addon.id] || 0;
              const isSelected = addonQty > 0;
              
              return (
                <div key={addon.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={addon.id}
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedAddonQuantities({ ...selectedAddonQuantities, [addon.id]: 1 });
                          } else {
                            const newQuantities = { ...selectedAddonQuantities };
                            delete newQuantities[addon.id];
                            setSelectedAddonQuantities(newQuantities);
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
                          <span className="text-sm text-muted-foreground ml-2">
                            +{formatCurrency(addon.price)}
                          </span>
                        </div>
                      </Label>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          const newQty = Math.max(1, addonQty - 1);
                          if (newQty === 0) {
                            const newQuantities = { ...selectedAddonQuantities };
                            delete newQuantities[addon.id];
                            setSelectedAddonQuantities(newQuantities);
                          } else {
                            setSelectedAddonQuantities({ ...selectedAddonQuantities, [addon.id]: newQty });
                          }
                        }}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-medium text-sm">{addonQty}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          setSelectedAddonQuantities({ ...selectedAddonQuantities, [addon.id]: Math.min(50, addonQty + 1) });
                        }}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}


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
