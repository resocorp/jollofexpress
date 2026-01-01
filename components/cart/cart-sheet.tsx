'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Trash2, Plus, Minus, ShoppingBag, MapPin, Gift, AlertTriangle, Crosshair, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCartStore } from '@/store/cart-store';
import { useValidatePromo } from '@/hooks/use-promo';
import { useDeliveryRegions } from '@/hooks/use-delivery-regions';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';
import type { DeliveryRegion } from '@/types/database';

export function CartSheet() {
  const { items, removeItem, updateItemQuantity, clearCart, promoCode, discount, setPromoCode, getSubtotal, selectedRegionId, setSelectedRegionId } = useCartStore();
  const [promoInput, setPromoInput] = useState('');
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<DeliveryRegion | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [showManualSelect, setShowManualSelect] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const validatePromo = useValidatePromo();
  const { data: regionsData, isLoading: isLoadingRegions } = useDeliveryRegions();

  // Detect region from GPS location
  const detectLocationRegion = useCallback(async () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported');
      setShowManualSelect(true);
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setIsDetectingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Call API to detect region from coordinates
          const response = await fetch('/api/delivery/regions/detect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude, longitude }),
          });

          const data = await response.json();

          if (data.detected && data.region) {
            // Find full region data from regionsData
            const fullRegion = regionsData?.all_regions?.find(r => r.id === data.region.id);
            if (fullRegion) {
              setSelectedRegion(fullRegion);
              setSelectedRegionId(fullRegion.id);
              toast.success(`📍 Detected: ${fullRegion.name}`);
              setShowManualSelect(false);
            } else {
              // Use partial region data from API
              setSelectedRegion(data.region as DeliveryRegion);
              setSelectedRegionId(data.region.id);
              toast.success(`📍 Detected: ${data.region.name}`);
              setShowManualSelect(false);
            }
          } else {
            setLocationError('Could not detect your area');
            setShowManualSelect(true);
            toast.info('We couldn\'t detect your area. Please select manually.');
          }
        } catch (error) {
          console.error('Region detection error:', error);
          setLocationError('Detection failed');
          setShowManualSelect(true);
          toast.error('Failed to detect your area. Please select manually.');
        } finally {
          setIsDetectingLocation(false);
        }
      },
      (error) => {
        setIsDetectingLocation(false);
        setShowManualSelect(true);
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Location permission denied');
            toast.error('Location access denied. Please select your area manually.');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('Location unavailable');
            toast.error('Location unavailable. Please select your area manually.');
            break;
          case error.TIMEOUT:
            setLocationError('Location request timed out');
            toast.error('Location request timed out. Please select your area manually.');
            break;
          default:
            setLocationError('Could not get location');
            toast.error('Could not get your location. Please select your area manually.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [regionsData, setSelectedRegionId]);

  const subtotal = getSubtotal();
  const taxRate = 7.5; // This should come from settings
  const tax = Math.round((subtotal * taxRate) / 100);
  
  // Calculate delivery fee based on selected region
  const isFreeDelivery = selectedRegion && 
    selectedRegion.free_delivery_threshold && 
    subtotal >= selectedRegion.free_delivery_threshold;
  const deliveryFee = selectedRegion ? (isFreeDelivery ? 0 : selectedRegion.delivery_fee) : 0;
  const total = subtotal + tax + deliveryFee - discount;

  // Sync selected region from persisted ID
  useEffect(() => {
    if (selectedRegionId && regionsData?.all_regions) {
      const region = regionsData.all_regions.find(r => r.id === selectedRegionId);
      if (region) {
        setSelectedRegion(region);
      }
    }
  }, [selectedRegionId, regionsData]);

  const handleRegionChange = (regionId: string) => {
    if (regionId === 'none') {
      setSelectedRegion(null);
      setSelectedRegionId(null);
    } else {
      const region = regionsData?.all_regions?.find(r => r.id === regionId);
      if (region) {
        setSelectedRegion(region);
        setSelectedRegionId(region.id);
      }
    }
  };

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) {
      toast.error('Please enter a promo code');
      return;
    }

    setIsValidatingPromo(true);
    try {
      const result = await validatePromo.mutateAsync({
        code: promoInput.trim().toUpperCase(),
        orderTotal: subtotal,
      });

      if (result.valid) {
        setPromoCode(promoInput.trim().toUpperCase(), result.discount_amount);
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to validate promo code');
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setPromoCode(null, 0);
    setPromoInput('');
    toast.success('Promo code removed');
  };

  if (items.length === 0) {
    return (
      <>
        <SheetHeader>
          <SheetTitle>Your Cart</SheetTitle>
          <SheetDescription>Your cart is empty</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <ShoppingBag className="h-24 w-24 text-muted-foreground/30 mb-4" />
          <p className="text-lg font-medium text-muted-foreground mb-2">Your cart is empty</p>
          <p className="text-sm text-muted-foreground mb-6">Add some delicious items to get started</p>
          <Link href="/menu">
            <Button>Browse Menu</Button>
          </Link>
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <SheetHeader>
        <SheetTitle>Your Cart ({items.length} {items.length === 1 ? 'item' : 'items'})</SheetTitle>
        <SheetDescription>Review your order before checkout</SheetDescription>
      </SheetHeader>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto py-6 space-y-4">
        {items.map((cartItem, index) => (
          <div key={index} className="flex gap-4 p-4 border rounded-lg">
            <div className="flex-1">
              <h4 className="font-medium">{cartItem.item.name}</h4>
              
              {/* Variations */}
              {cartItem.selected_variation && (
                <p className="text-sm text-muted-foreground">
                  {cartItem.selected_variation.variation_name}: {cartItem.selected_variation.option.name}
                  {cartItem.selected_variation.quantity && cartItem.selected_variation.quantity > 1 && (
                    <span className="font-medium"> × {cartItem.selected_variation.quantity}</span>
                  )}
                </p>
              )}
              
              {/* Addons */}
              {cartItem.selected_addons.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Add-ons: {cartItem.selected_addons.map(a => `${a.name} × ${a.quantity}`).join(', ')}
                </p>
              )}

              {/* Quantity Controls */}
              <div className="flex items-center gap-2 mt-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateItemQuantity(index, cartItem.quantity - 1)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center font-medium">{cartItem.quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateItemQuantity(index, cartItem.quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col items-end justify-between">
              <p className="font-semibold">{formatCurrency(cartItem.subtotal)}</p>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => removeItem(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Separator className="my-4" />

      {/* Promo Code */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Promo Code</label>
        {promoCode ? (
          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
            <span className="text-sm font-medium text-green-700">{promoCode} applied</span>
            <Button variant="ghost" size="sm" onClick={handleRemovePromo}>
              Remove
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              placeholder="Enter code"
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
            />
            <Button
              variant="outline"
              onClick={handleApplyPromo}
              disabled={isValidatingPromo || !promoInput.trim()}
            >
              Apply
            </Button>
          </div>
        )}
      </div>

      <Separator className="my-4" />

      {/* Delivery Region - Location Detection Primary */}
      <div className="space-y-3">
        <label className="text-sm font-medium flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Where should we deliver?
        </label>

        {/* Selected Region Display */}
        {selectedRegion ? (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-900">{selectedRegion.name}</span>
              </div>
              <span className="font-bold text-green-700">
                {isFreeDelivery ? 'FREE' : formatCurrency(selectedRegion.delivery_fee)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowManualSelect(!showManualSelect)}
              className="text-xs text-green-600 hover:text-green-700 mt-1 underline"
            >
              Change area
            </button>
          </div>
        ) : (
          /* Primary: Use My Location Button */
          <Button
            type="button"
            onClick={detectLocationRegion}
            disabled={isDetectingLocation}
            className="w-full"
            size="lg"
          >
            {isDetectingLocation ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Detecting your location...
              </>
            ) : (
              <>
                <Crosshair className="h-4 w-4 mr-2" />
                Use My Location
              </>
            )}
          </Button>
        )}

        {/* Manual Selection Fallback */}
        {!selectedRegion && (
          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowManualSelect(!showManualSelect)}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mx-auto"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${showManualSelect ? 'rotate-180' : ''}`} />
              {showManualSelect ? 'Hide' : 'Or select your area manually'}
            </button>
          </div>
        )}

        {/* Manual Select Dropdown */}
        {(showManualSelect || selectedRegion) && (
          <Select 
            value={selectedRegion?.id || 'none'} 
            onValueChange={handleRegionChange}
          >
            <SelectTrigger className={!selectedRegion ? 'border-amber-500' : ''}>
              <SelectValue placeholder={isLoadingRegions ? 'Loading...' : 'Select delivery area'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Select your area</SelectItem>
              {regionsData?.groups?.map((group) => (
                group.regions && group.regions.length > 0 && (
                  <div key={group.id}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted">
                      {group.name}
                    </div>
                    {group.regions.map((region: DeliveryRegion) => (
                      <SelectItem key={region.id} value={region.id}>
                        <div className="flex items-center justify-between w-full gap-4">
                          <span>{region.name}</span>
                          <span className="text-muted-foreground text-sm">
                            {formatCurrency(region.delivery_fee)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </div>
                )
              ))}
              {regionsData?.ungrouped && regionsData.ungrouped.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted">
                    Other Areas
                  </div>
                  {regionsData.ungrouped.map((region: DeliveryRegion) => (
                    <SelectItem key={region.id} value={region.id}>
                      <div className="flex items-center justify-between w-full gap-4">
                        <span>{region.name}</span>
                        <span className="text-muted-foreground text-sm">
                          {formatCurrency(region.delivery_fee)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
        )}
        
        {/* Region info alerts */}
        {selectedRegion && isFreeDelivery && (
          <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            <Gift className="h-4 w-4" />
            <span>Free delivery! Your order qualifies.</span>
          </div>
        )}
        {selectedRegion && selectedRegion.free_delivery_threshold && !isFreeDelivery && (
          <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            <AlertTriangle className="h-4 w-4" />
            <span>Add {formatCurrency(selectedRegion.free_delivery_threshold - subtotal)} more for free delivery!</span>
          </div>
        )}
      </div>

      <Separator className="my-4" />

      {/* Order Summary */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        {selectedRegion && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Delivery ({selectedRegion.name})</span>
            {isFreeDelivery ? (
              <span className="text-green-600 font-medium">FREE</span>
            ) : (
              <span>{formatCurrency(deliveryFee)}</span>
            )}
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tax (7.5%)</span>
          <span>{formatCurrency(tax)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount</span>
            <span>-{formatCurrency(discount)}</span>
          </div>
        )}
        <Separator />
        <div className="flex justify-between text-lg font-bold">
          <span>Estimated Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
        <p className="text-xs text-muted-foreground italic pt-1">
          {selectedRegion ? '* Final total includes delivery to your selected area' : '* Select delivery area to see final total'}
        </p>
      </div>

      {/* Checkout Button */}
      <div className="mt-6 space-y-2">
        <Link href="/checkout">
          <Button className="w-full" size="lg">
            Proceed to Checkout
          </Button>
        </Link>
        <Button variant="ghost" className="w-full" onClick={clearCart}>
          Clear Cart
        </Button>
      </div>
    </div>
  );
}
