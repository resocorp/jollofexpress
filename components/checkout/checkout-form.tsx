'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { checkoutSchema, type CheckoutFormData } from '@/lib/validations';
import { useCartStore } from '@/store/cart-store';
import { useCreateOrder } from '@/hooks/use-orders';
import { useDeliverySettings, usePaymentSettings } from '@/hooks/use-settings';
import { useOrderWindow } from '@/hooks/use-order-window';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/formatters';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LocationShareButton } from './location-share-button';

interface CheckoutFormProps {
  onSubmitExposed?: (submitFn: () => void) => void;
  onSubmittingChange?: (isSubmitting: boolean) => void;
}

export function CheckoutForm({ 
  onSubmitExposed,
  onSubmittingChange,
}: CheckoutFormProps) {
  const router = useRouter();
  const { items, discount, promoCode, getSubtotal, setPendingOrder } = useCartStore();
  const createOrder = useCreateOrder();
  const { data: deliverySettings, isLoading: isLoadingSettings } = useDeliverySettings();
  const { data: paymentSettings } = usePaymentSettings();
  const { isAccepting, isPreorder, deliveryDate, deliveryWindow, restaurantClosed } = useOrderWindow();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerLocation, setCustomerLocation] = useState<{ latitude: number; longitude: number; address?: string } | null>(null);
  const [highlightedField, setHighlightedField] = useState<string | null>(null);
  const [showFieldHighlight, setShowFieldHighlight] = useState(false);
  // Payment method is always 'paystack' (online only)
  const paymentMethod = 'paystack' as const;

  // Constants for field highlight persistence
  const FIELD_HIGHLIGHT_KEY = 'jollof_field_highlight_count';
  const MAX_HIGHLIGHT_VIEWS = 5;

  // Load saved customer info from localStorage
  const getSavedCustomerInfo = () => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem('jollof_customer_info');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  };

  const savedInfo = getSavedCustomerInfo();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      orderType: 'delivery',
      name: savedInfo?.name || '',
      phone: savedInfo?.phone || '',
      phoneAlt: savedInfo?.phoneAlt || savedInfo?.phone || '',
      // Unticked by default — user explicitly clicks "Same as calling" to mirror.
      // Restore as ticked only when previously saved values were identical.
      phoneAltDifferent: !(
        savedInfo?.phoneAlt &&
        savedInfo?.phone &&
        savedInfo.phoneAlt === savedInfo.phone
      ),
      email: savedInfo?.email || '',
      fullAddress: savedInfo?.fullAddress || '',
    },
  });

  const phoneAltDifferent = watch('phoneAltDifferent');
  const watchedPhoneAlt = watch('phoneAlt');

  // When "Same as calling" is ticked, keep WhatsApp value mirrored from Calling.
  useEffect(() => {
    if (!phoneAltDifferent) {
      setValue('phone', watchedPhoneAlt || '', { shouldValidate: false });
    }
  }, [phoneAltDifferent, watchedPhoneAlt, setValue]);

  // Check if returning customer (has saved info)
  const isReturningCustomer = !!savedInfo?.name && !!savedInfo?.phone && !!savedInfo?.fullAddress;

  // Watch form values for field highlight logic
  const watchedName = watch('name');
  const watchedPhone = watch('phone');
  const watchedAddress = watch('fullAddress');

  // Determine which field needs attention
  const getNextEmptyRequiredField = useCallback(() => {
    if (!watchedName?.trim()) return 'name';
    if (!watchedPhoneAlt?.trim()) return 'phoneAlt';
    if (phoneAltDifferent && !watchedPhone?.trim()) return 'phone';
    if (!watchedAddress?.trim()) return 'fullAddress';
    return null;
  }, [watchedName, watchedPhoneAlt, phoneAltDifferent, watchedPhone, watchedAddress]);

  // Check if should show field highlights (localStorage persistence)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const count = parseInt(localStorage.getItem(FIELD_HIGHLIGHT_KEY) || '0', 10);
      setShowFieldHighlight(count < MAX_HIGHLIGHT_VIEWS);
      if (count < MAX_HIGHLIGHT_VIEWS) {
        localStorage.setItem(FIELD_HIGHLIGHT_KEY, String(count + 1));
      }
    } catch {
      setShowFieldHighlight(true);
    }
  }, []);

  // Update highlighted field when form values change
  useEffect(() => {
    if (!showFieldHighlight) {
      setHighlightedField(null);
      return;
    }
    const nextField = getNextEmptyRequiredField();
    setHighlightedField(nextField);
  }, [showFieldHighlight, getNextEmptyRequiredField]);

  // Order type is always delivery
  const orderType = 'delivery' as const;

  // Expose isSubmitting state to parent
  useEffect(() => {
    if (onSubmittingChange) {
      onSubmittingChange(isSubmitting);
    }
  }, [isSubmitting, onSubmittingChange]);

  const subtotal = getSubtotal();
  const taxRate = paymentSettings?.tax_rate ?? 0;
  
  // Check if order qualifies for free delivery based on global threshold
  const freeDeliveryThreshold = deliverySettings?.free_delivery_threshold;
  const qualifiesForFreeDelivery = freeDeliveryThreshold && subtotal >= freeDeliveryThreshold;
  
  // Use standard delivery fee from admin settings (free if above threshold)
  const deliveryFee = orderType === 'delivery' 
    ? (qualifiesForFreeDelivery ? 0 : (deliverySettings?.delivery_fee || 0)) 
    : 0;
  
  // VAT should be applied to subtotal + delivery fee (only if tax rate > 0)
  const tax = taxRate > 0 ? Math.round(((subtotal + deliveryFee) * taxRate) / 100) : 0;
  const total = subtotal + tax + deliveryFee - discount;
  const minOrder = deliverySettings?.min_order || 0;
  const isBelowMinimum = orderType === 'delivery' && subtotal < minOrder;

  const onSubmit = async (data: CheckoutFormData) => {
    // Log delivery fee calculation at submission time
    console.log('[CHECKOUT SUBMIT] Order pricing:', {
      orderType: data.orderType,
      deliverySettings,
      deliveryFee,
      subtotal,
      tax,
      discount,
      total,
      calculated_total: subtotal + deliveryFee + tax - discount
    });

    // Validate minimum order (only if delivery settings are loaded)
    if (data.orderType === 'delivery' && deliverySettings && isBelowMinimum) {
      toast.error(`Minimum order amount is ${formatCurrency(minOrder)} for delivery`);
      return;
    }

    // Mandatory location for delivery orders (GPS or map-pin)
    if (
      data.orderType === 'delivery' &&
      (!customerLocation?.latitude || !customerLocation?.longitude)
    ) {
      toast.error('Please share your location or drop a pin on the map to continue.');
      setHighlightedField('location');
      setShowFieldHighlight(true);
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare order items
      const orderItems = items.map((cartItem) => ({
        item_id: cartItem.item.id,
        item_name: cartItem.item.name,
        quantity: cartItem.quantity,
        unit_price: cartItem.item.base_price,
        selected_variation: cartItem.selected_variation
          ? {
              name: cartItem.selected_variation.variation_name,
              option: cartItem.selected_variation.option.name,
              price_adjustment: cartItem.selected_variation.option.price_adjustment,
              quantity: cartItem.selected_variation.quantity,
            }
          : undefined,
        selected_addons: cartItem.selected_addons.map((addon) => ({
          name: addon.name,
          price: addon.price,
          quantity: addon.quantity,
        })),
        subtotal: cartItem.subtotal,
      }));

      // Save customer info to localStorage for future orders
      try {
        localStorage.setItem('jollof_customer_info', JSON.stringify({
          name: data.name,
          phone: data.phone,
          phoneAlt: data.phoneAlt || '',
          email: data.email || '',
          fullAddress: data.fullAddress || '',
        }));
      } catch { /* ignore storage errors */ }

      // Use fallback email for Paystack if customer didn't provide one
      const customerEmail = data.email?.trim() || 'maintegraventures@gmail.com';

      // Create order
      console.log('[CHECKOUT] Customer location state:', customerLocation);
      
      const orderData = {
        customer_name: data.name,
        customer_phone: data.phone,
        customer_email: customerEmail,
        order_type: data.orderType,
        delivery_city: data.orderType === 'delivery' ? 'Awka' : undefined,
        delivery_address: data.orderType === 'delivery' ? data.fullAddress : undefined,
        delivery_instructions: data.deliveryInstructions,
        customer_phone_alt: data.phoneAlt || undefined,
        customer_latitude: customerLocation?.latitude,
        customer_longitude: customerLocation?.longitude,
        payment_method_type: paymentMethod,
        subtotal,
        delivery_fee: deliveryFee,
        tax,
        discount,
        total,
        promo_code: promoCode || undefined,
        items: orderItems,
      };

      const result = await createOrder.mutateAsync(orderData);

      // Verify order was created successfully
      if (!result || !result.order) {
        throw new Error('Order creation failed - no order returned');
      }

      console.log('Order created successfully:', result.order.id);
      
      // Show scheduled order notice if applicable
      if (result.scheduled && result.scheduled_note) {
        toast.info('Order Scheduled', {
          description: result.scheduled_note,
          duration: 8000,
        });
      }

      // Store pending order ID (cart will be cleared after successful payment)
      setPendingOrder(result.order.id);

      // Redirect to payment
      if (result.payment_url) {
        console.log('Redirecting to payment:', result.payment_url);
        window.location.href = result.payment_url;
      } else {
        toast.error('Payment initialization failed. Please contact support with order #' + result.order.order_number);
      }
    } catch (error: any) {
      // Show detailed error to user
      const errorMessage = error.message || error.error || 'Failed to create order';
      
      if (errorMessage.includes('Kitchen at capacity') || errorMessage.includes('capacity')) {
        // Kitchen at max capacity (expected error, no console log)
        const details = error.response?.details;
        toast.error('Kitchen at Capacity', {
          description: `We're currently experiencing high demand${details ? ` (${details.activeOrders}/${details.maxOrders} orders)` : ''}. Please try again in a few minutes.`,
          duration: 6000,
        });
      } else if (errorMessage.includes('RLS') || errorMessage.includes('security')) {
        // Unexpected error - log to console
        console.error('Order creation error (RLS):', error);
        toast.error('System configuration error. Please contact support.');
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        // Network error - log to console
        console.error('Order creation error (Network):', error);
        toast.error('Network error. Please check your connection and try again.');
      } else {
        // Unknown error - log to console
        console.error('Order creation error:', error);
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Scroll to first error when validation fails
  const handleFormError = () => {
    const firstError = Object.keys(errors)[0];
    if (firstError) {
      const element = document.getElementById(firstError);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.focus();
      }
      
      // Show error message
      const errorMessages = Object.values(errors).map(err => err?.message).filter(Boolean);
      if (errorMessages.length > 0) {
        toast.error(errorMessages[0] as string);
      }
    }
  };

  // Expose submit function to parent
  // IMPORTANT: Include all values used in onSubmit to avoid stale closures
  // When discount/total changes (e.g., promo code applied), the parent needs the updated function
  useEffect(() => {
    if (onSubmitExposed) {
      onSubmitExposed(() => {
        handleSubmit(onSubmit, handleFormError)();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSubmitExposed, orderType, discount, promoCode, subtotal, total, deliveryFee, tax, customerLocation]);

  return (
    <form onSubmit={handleSubmit(onSubmit, handleFormError)} className="space-y-6">
      {/* Batch Delivery Confirmation */}
      {deliveryWindow && restaurantClosed && (
        <Alert className="border-2 border-purple-400 bg-purple-50 dark:border-purple-500/40 dark:bg-purple-500/10">
          <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <AlertTitle className="text-lg font-bold text-purple-900 dark:text-purple-200">
            {`📅 We're closed right now · Delivery ${deliveryDate} between ${deliveryWindow}`}
          </AlertTitle>
          <AlertDescription className="mt-2 text-purple-800 dark:text-purple-300">
            Your shawarma will be grilled fresh for the next delivery window.
          </AlertDescription>
        </Alert>
      )}
      {deliveryWindow && !restaurantClosed && (
        <Alert className={`border-2 ${isPreorder ? 'border-blue-400 bg-blue-50' : 'border-green-400 bg-green-50'}`}>
          <Clock className={`h-5 w-5 ${isPreorder ? 'text-blue-600' : 'text-green-600'}`} />
          <AlertTitle className={`text-lg font-bold ${isPreorder ? 'text-blue-900' : 'text-green-900'}`}>
            {isPreorder
              ? `📅 Your order will be delivered ${deliveryDate} between ${deliveryWindow}`
              : `✅ Your order will be delivered today between ${deliveryWindow}`
            }
          </AlertTitle>
          <AlertDescription className={`mt-2 ${isPreorder ? 'text-blue-800' : 'text-green-800'}`}>
            {isPreorder
              ? "Today's batch has closed. Your shawarma will be grilled fresh for the next delivery window."
              : "We'll grill your shawarma fresh this afternoon. You'll receive a WhatsApp notification when it's on the way."
            }
          </AlertDescription>
        </Alert>
      )}

      {/* Hidden field to keep orderType as delivery */}
      <input type="hidden" {...register('orderType')} value="delivery" />

      {/* Quick Order Again for returning customers */}
      {isReturningCustomer && (
        <Card className="border-2 border-green-500 bg-green-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-green-800">Welcome back, {savedInfo.name}!</p>
                <p className="text-sm text-green-700 truncate">{savedInfo.fullAddress}</p>
              </div>
              <Button
                type="submit"
                disabled={isSubmitting || isBelowMinimum}
                className="bg-green-600 hover:bg-green-700 whitespace-nowrap"
              >
                {isSubmitting ? 'Processing...' : 'Order Again →'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contact & Delivery Info - Single streamlined card */}
      <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">{isReturningCustomer ? 'Edit Details' : 'Your Details'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
          {/* Name */}
          <div className={`space-y-1 ${showFieldHighlight ? 'field-attention' : ''}`}>
            <Label htmlFor="name">Name / Alias <span className="text-destructive">*</span></Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Your name"
              className={`${errors.name ? 'border-destructive' : ''} ${highlightedField === 'name' ? 'field-highlighted' : ''}`}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          {/* Calling Number — always shown, always required */}
          <div className={`space-y-1 ${showFieldHighlight ? 'field-attention' : ''}`}>
            <Label htmlFor="phoneAlt">Calling Number <span className="text-destructive">*</span></Label>
            <Input
              id="phoneAlt"
              {...register('phoneAlt')}
              placeholder="08012345678"
              className={`${errors.phoneAlt ? 'border-destructive' : ''} ${highlightedField === 'phoneAlt' ? 'field-highlighted' : ''}`}
            />
            {errors.phoneAlt && <p className="text-sm text-destructive">{errors.phoneAlt.message}</p>}
          </div>

          {/* WhatsApp Number — always shown, with "Same as calling" toggle */}
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="phone">WhatsApp Number <span className="text-destructive">*</span></Label>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="phoneSame"
                  checked={!phoneAltDifferent}
                  onCheckedChange={(checked) => {
                    setValue('phoneAltDifferent', checked !== true, { shouldValidate: true });
                  }}
                />
                <Label htmlFor="phoneSame" className="text-sm font-normal cursor-pointer">
                  Same as calling
                </Label>
              </div>
            </div>
            <Input
              id="phone"
              {...register('phone')}
              placeholder="08012345678"
              disabled={!phoneAltDifferent}
              className={errors.phone && phoneAltDifferent ? 'border-destructive' : ''}
            />
            {phoneAltDifferent && errors.phone && (
              <p className="text-sm text-destructive">{errors.phone.message}</p>
            )}
          </div>

          {/* Email - optional */}
          <div className={`space-y-1 ${showFieldHighlight ? 'field-attention' : ''}`}>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="you@example.com (optional)"
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          {/* Address */}
          <div className={`space-y-1 ${showFieldHighlight ? 'field-attention' : ''}`}>
            <Label htmlFor="fullAddress">Delivery Address <span className="text-destructive">*</span></Label>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Please help us get to you fast — describe how to find your place, include popular landmarks nearby (e.g. close to a school, church, filling station, junction), gate colour or building description, and please stay active on your phone so the rider can reach you.
            </p>
            <Textarea
              id="fullAddress"
              {...register('fullAddress')}
              placeholder="e.g. 12 Zik Avenue, opposite Total filling station, blue gate next to Zenith Bank — call when you reach the junction"
              rows={3}
              className={`${errors.fullAddress ? 'border-destructive' : ''} ${highlightedField === 'fullAddress' ? 'field-highlighted' : ''}`}
            />
            {errors.fullAddress && <p className="text-sm text-destructive">{errors.fullAddress.message}</p>}
          </div>

          {/* Location Sharing - Required for delivery */}
          <div className="pt-2">
            <LocationShareButton
              required={orderType === 'delivery'}
              highlight={highlightedField === 'location' && showFieldHighlight}
              onLocationCaptured={(location) => {
                setCustomerLocation(location ? {
                  latitude: location.latitude,
                  longitude: location.longitude,
                } : null);
                if (location && highlightedField === 'location') {
                  setHighlightedField(null);
                }
              }}
            />
          </div>

        </CardContent>
      </Card>

      {/* Minimum Order Warning */}
      {isBelowMinimum && (
        <Alert variant="destructive" className="border-2 border-red-500">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold mb-2">Minimum order not met</p>
              <p>
                Minimum order amount for delivery is {formatCurrency(minOrder)}. 
                Your current subtotal is {formatCurrency(subtotal)}. 
                Please add {formatCurrency(minOrder - subtotal)} more to proceed.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push('/menu')}
              className="whitespace-nowrap bg-card hover:bg-muted text-red-600 border-red-600 font-semibold flex-shrink-0"
            >
              Add More Items
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Back to Menu Button */}
      <div className="pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/menu')}
          disabled={isSubmitting}
          size="lg"
          className="w-full sm:w-auto min-h-[56px]"
        >
          ← Back to Menu
        </Button>
      </div>
    </form>
  );
}
