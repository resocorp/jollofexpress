'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCartStore } from '@/store/cart-store';
import { useDeliverySettings, usePaymentSettings } from '@/hooks/use-settings';
import { useValidatePromo } from '@/hooks/use-promo';
import { formatCurrency } from '@/lib/formatters';
import { ShoppingCart, Tag, Bike, Receipt, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface OrderSummaryProps {
  orderType?: 'delivery' | 'carryout';
}

export function OrderSummary({ orderType = 'delivery' }: OrderSummaryProps) {
  const { items, discount, promoCode, getSubtotal, setPromoCode } = useCartStore();
  const { data: deliverySettings } = useDeliverySettings();
  const { data: paymentSettings } = usePaymentSettings();
  const validatePromo = useValidatePromo();
  const [promoInput, setPromoInput] = useState(promoCode || '');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastValidatedInputRef = useRef<string | null>(null);
  
  const subtotal = getSubtotal();
  const taxRate = paymentSettings?.tax_rate ?? 0;
  const deliveryFee = orderType === 'delivery' ? (deliverySettings?.delivery_fee || 0) : 0;
  
  // Correct calculation:
  // 1. Discount is applied to subtotal (cart items only)
  // 2. Taxable amount = (subtotal - discount) + deliveryFee
  // 3. VAT = taxRate% of taxable amount
  const discountedSubtotal = subtotal - discount;
  const taxableAmount = discountedSubtotal + deliveryFee;
  const tax = Math.round((taxableAmount * taxRate) / 100);
  const total = discountedSubtotal + deliveryFee + tax;

  // Auto-validate promo code with debounce - validates once per unique input
  useEffect(() => {
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const normalizedInput = promoInput.trim().toUpperCase();

    // If input is empty or already applied, skip
    if (!promoInput.trim() || promoCode === normalizedInput) {
      setValidationError(null);
      setIsValidating(false);
      return;
    }

    // If this exact input was already validated, don't re-validate
    if (lastValidatedInputRef.current === normalizedInput) {
      return;
    }

    // Set debounce timer (500ms after user stops typing)
    debounceTimerRef.current = setTimeout(async () => {
      setIsValidating(true);
      setValidationError(null);
      
      try {
        const result = await validatePromo.mutateAsync({
          code: normalizedInput,
          orderTotal: subtotal,
        });

        lastValidatedInputRef.current = normalizedInput;

        if (result.valid) {
          setPromoCode(normalizedInput, result.discount_amount);
          setValidationError(null);
          toast.success(`Promo code applied! You saved ${formatCurrency(result.discount_amount)}`);
        } else {
          setValidationError(result.message || 'Invalid promo code');
        }
      } catch (error: any) {
        lastValidatedInputRef.current = normalizedInput;
        setValidationError(error.message || 'Failed to validate promo code');
      } finally {
        setIsValidating(false);
      }
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [promoInput, subtotal, promoCode, setPromoCode, validatePromo]);

  const handlePromoInputChange = (value: string) => {
    const newValue = value.toUpperCase();
    setPromoInput(newValue);
    // Reset validation cache when input changes
    if (lastValidatedInputRef.current && newValue.trim() !== lastValidatedInputRef.current) {
      lastValidatedInputRef.current = null;
    }
    // Clear any previous error when user starts typing again
    if (validationError) {
      setValidationError(null);
    }
  };

  const handleRemovePromo = () => {
    setPromoCode(null, 0);
    setPromoInput('');
    lastValidatedInputRef.current = null;
    toast.success('Promo code removed');
  };

  return (
    <Card className="border-2 shadow-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 via-orange-50 to-red-50 border-b">
        <CardTitle className="flex items-center gap-2 text-xl">
          <ShoppingCart className="h-5 w-5 text-primary" />
          Order Summary
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          {items.length} {items.length === 1 ? 'item' : 'items'} in your cart
        </p>
      </CardHeader>
      <CardContent className="space-y-5 p-6">
        {/* Order Items */}
        <div className="space-y-4">
          {items.map((cartItem, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex-shrink-0">
                {cartItem.quantity}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">
                  {cartItem.item.name}
                </p>
                {cartItem.selected_variation && (
                  <p className="text-xs text-muted-foreground mt-1">
                    • {cartItem.selected_variation.option.name}
                    {cartItem.selected_variation.quantity && cartItem.selected_variation.quantity > 1 && (
                      <span className="font-medium"> × {cartItem.selected_variation.quantity}</span>
                    )}
                  </p>
                )}
                {cartItem.selected_addons.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    + {cartItem.selected_addons.map(a => `${a.name} × ${a.quantity}`).join(', ')}
                  </p>
                )}
              </div>
              <span className="font-bold text-sm text-primary whitespace-nowrap">
                {formatCurrency(cartItem.subtotal)}
              </span>
            </motion.div>
          ))}
        </div>

        <Separator className="my-4" />

        {/* Promo Code Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Have a promo code?</span>
          </div>
          
          {!promoCode ? (
            <div className="space-y-2">
              <div className="relative">
                <Input
                  placeholder="Enter code"
                  value={promoInput}
                  onChange={(e) => handlePromoInputChange(e.target.value)}
                  disabled={isValidating}
                  className={`uppercase pr-10 ${validationError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
                {isValidating && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
              {validationError && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  {validationError}
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">{promoCode}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemovePromo}
                className="h-auto p-1 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <Separator className="my-4" />

        {/* Price Breakdown */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Subtotal
            </span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>
          {orderType === 'delivery' && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-2">
                <Bike className="h-4 w-4" />
                Delivery Fee
              </span>
              <span className="font-medium">{formatCurrency(deliveryFee)}</span>
            </div>
          )}
          {taxRate > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tax ({taxRate}%)
              </span>
              <span className="font-medium">{formatCurrency(tax)}</span>
            </div>
          )}
          {discount > 0 && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
              <span className="text-green-700 font-medium">Discount Applied</span>
              <span className="text-green-700 font-bold">-{formatCurrency(discount)}</span>
            </div>
          )}
        </div>

        <Separator className="my-4" />

        {/* Total */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-primary to-orange-600 text-white shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm opacity-90">Total Amount</p>
              <p className="text-3xl font-bold">{formatCurrency(total)}</p>
            </div>
            <div className="text-right">
              <Badge className="bg-white/20 backdrop-blur-sm border-white/30 text-white">
                {orderType === 'delivery' ? 'Delivery' : 'Carryout'}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface OrderSummaryWithButtonProps extends OrderSummaryProps {
  onSubmit?: () => void;
  isSubmitting?: boolean;
  isBelowMinimum?: boolean;
  isLoadingSettings?: boolean;
}

export function OrderSummaryWithButton({ 
  orderType = 'delivery',
  onSubmit,
  isSubmitting = false,
  isBelowMinimum = false,
  isLoadingSettings = false,
}: OrderSummaryWithButtonProps) {
  const { items, discount, promoCode, getSubtotal, setPromoCode } = useCartStore();
  const { data: deliverySettings } = useDeliverySettings();
  const { data: paymentSettings } = usePaymentSettings();
  const validatePromo = useValidatePromo();
  const [promoInput, setPromoInput] = useState(promoCode || '');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastValidatedInputRef = useRef<string | null>(null);
  
  const subtotal = getSubtotal();
  const taxRate = paymentSettings?.tax_rate ?? 0;
  
  // Use standard delivery fee from admin settings
  const deliveryFee = orderType === 'delivery' ? (deliverySettings?.delivery_fee || 0) : 0;
  
  // Correct calculation:
  // 1. Discount is applied to subtotal (cart items only)
  // 2. Taxable amount = (subtotal - discount) + deliveryFee
  // 3. VAT = taxRate% of taxable amount
  const discountedSubtotal = subtotal - discount;
  const taxableAmount = discountedSubtotal + deliveryFee;
  const tax = Math.round((taxableAmount * taxRate) / 100);
  const total = discountedSubtotal + deliveryFee + tax;

  // Auto-validate promo code with debounce - validates once per unique input
  useEffect(() => {
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const normalizedInput = promoInput.trim().toUpperCase();

    // If input is empty or already applied, skip
    if (!promoInput.trim() || promoCode === normalizedInput) {
      setValidationError(null);
      setIsValidating(false);
      return;
    }

    // If this exact input was already validated, don't re-validate
    if (lastValidatedInputRef.current === normalizedInput) {
      return;
    }

    // Set debounce timer (500ms after user stops typing)
    debounceTimerRef.current = setTimeout(async () => {
      setIsValidating(true);
      setValidationError(null);
      
      try {
        const result = await validatePromo.mutateAsync({
          code: normalizedInput,
          orderTotal: subtotal,
        });

        lastValidatedInputRef.current = normalizedInput;

        if (result.valid) {
          setPromoCode(normalizedInput, result.discount_amount);
          setValidationError(null);
          toast.success(`Promo code applied! You saved ${formatCurrency(result.discount_amount)}`);
        } else {
          setValidationError(result.message || 'Invalid promo code');
        }
      } catch (error: any) {
        lastValidatedInputRef.current = normalizedInput;
        setValidationError(error.message || 'Failed to validate promo code');
      } finally {
        setIsValidating(false);
      }
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [promoInput, subtotal, promoCode, setPromoCode, validatePromo]);

  const handlePromoInputChange = (value: string) => {
    const newValue = value.toUpperCase();
    setPromoInput(newValue);
    // Reset validation cache when input changes
    if (lastValidatedInputRef.current && newValue.trim() !== lastValidatedInputRef.current) {
      lastValidatedInputRef.current = null;
    }
    // Clear any previous error when user starts typing again
    if (validationError) {
      setValidationError(null);
    }
  };

  const handleRemovePromo = () => {
    setPromoCode(null, 0);
    setPromoInput('');
    lastValidatedInputRef.current = null;
    toast.success('Promo code removed');
  };

  return (
    <Card className="border-2 shadow-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 via-orange-50 to-red-50 border-b">
        <CardTitle className="flex items-center gap-2 text-xl">
          <ShoppingCart className="h-5 w-5 text-primary" />
          Order Summary
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          {items.length} {items.length === 1 ? 'item' : 'items'} in your cart
        </p>
      </CardHeader>
      <CardContent className="space-y-5 p-6">
        {/* Order Items */}
        <div className="space-y-4">
          {items.map((cartItem, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex-shrink-0">
                {cartItem.quantity}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">
                  {cartItem.item.name}
                </p>
                {cartItem.selected_variation && (
                  <p className="text-xs text-muted-foreground mt-1">
                    • {cartItem.selected_variation.option.name}
                    {cartItem.selected_variation.quantity && cartItem.selected_variation.quantity > 1 && (
                      <span className="font-medium"> × {cartItem.selected_variation.quantity}</span>
                    )}
                  </p>
                )}
                {cartItem.selected_addons.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    + {cartItem.selected_addons.map(a => `${a.name} × ${a.quantity}`).join(', ')}
                  </p>
                )}
              </div>
              <span className="font-bold text-sm text-primary whitespace-nowrap">
                {formatCurrency(cartItem.subtotal)}
              </span>
            </motion.div>
          ))}
        </div>

        <Separator className="my-4" />

        {/* Promo Code Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Have a promo code?</span>
          </div>
          
          {!promoCode ? (
            <div className="space-y-2">
              <div className="relative">
                <Input
                  placeholder="Enter code"
                  value={promoInput}
                  onChange={(e) => handlePromoInputChange(e.target.value)}
                  disabled={isValidating}
                  className={`uppercase pr-10 ${validationError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
                {isValidating && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
              {validationError && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  {validationError}
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">{promoCode}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemovePromo}
                className="h-auto p-1 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <Separator className="my-4" />

        {/* Price Breakdown */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Subtotal
            </span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>
          {orderType === 'delivery' && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-2">
                <Bike className="h-4 w-4" />
                Delivery Fee
              </span>
              <span className="font-medium">{formatCurrency(deliveryFee)}</span>
            </div>
          )}
          {taxRate > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tax ({taxRate}%)
              </span>
              <span className="font-medium">{formatCurrency(tax)}</span>
            </div>
          )}
          {discount > 0 && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
              <span className="text-green-700 font-medium">Discount Applied</span>
              <span className="text-green-700 font-bold">-{formatCurrency(discount)}</span>
            </div>
          )}
        </div>

        <Separator className="my-4" />

        {/* Combined Total Amount and Payment Button */}
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-gradient-to-r from-primary to-orange-600 text-white shadow-lg">
            <div className="flex justify-between items-center mb-3">
              <div>
                <p className="text-sm opacity-90">Total Amount</p>
                <p className="text-3xl font-bold">{formatCurrency(total)}</p>
              </div>
              <div className="text-right">
                <Badge className="bg-white/20 backdrop-blur-sm border-white/30 text-white">
                  {orderType === 'delivery' ? 'Delivery' : 'Carryout'}
                </Badge>
              </div>
            </div>
          </div>
          
          <Button 
            type="button"
            onClick={onSubmit}
            size="lg" 
            disabled={isSubmitting || isBelowMinimum || isLoadingSettings}
            className="w-full min-h-[56px] bg-gradient-to-r from-amber-900 to-red-900 hover:from-amber-800 hover:to-red-800 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Proceed to Payment →
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
