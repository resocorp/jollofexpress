'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { checkoutSchema, type CheckoutFormData } from '@/lib/validations';
import { useCartStore } from '@/store/cart-store';
import { useCreateOrder } from '@/hooks/use-orders';
import { useDeliverySettings, usePaymentSettings, useRestaurantStatus } from '@/hooks/use-settings';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/formatters';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
  const { data: restaurantStatus } = useRestaurantStatus();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerLocation, setCustomerLocation] = useState<{ latitude: number; longitude: number; address?: string } | null>(null);
  // Payment method is always 'paystack' (online only)
  const paymentMethod = 'paystack' as const;

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
      email: savedInfo?.email || '',
      fullAddress: savedInfo?.fullAddress || '',
    },
  });

  // Check if returning customer (has saved info)
  const isReturningCustomer = !!savedInfo?.name && !!savedInfo?.phone && !!savedInfo?.fullAddress;

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
  
  // Use standard delivery fee from admin settings
  const deliveryFee = orderType === 'delivery' ? (deliverySettings?.delivery_fee || 0) : 0;
  
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
          email: data.email || '',
          fullAddress: data.fullAddress || '',
        }));
      } catch { /* ignore storage errors */ }

      // Use fallback email for Paystack if customer didn't provide one
      const customerEmail = data.email?.trim() || 'maintegraventures@gmail.com';

      // Create order
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
  }, [onSubmitExposed, orderType, discount, promoCode, subtotal, total, deliveryFee, tax]);

  return (
    <form onSubmit={handleSubmit(onSubmit, handleFormError)} className="space-y-6">
      {/* Restaurant Closed Notice */}
      {!restaurantStatus?.is_open && (
        <Alert className="border-2 border-amber-500 bg-amber-50">
          <Clock className="h-5 w-5 text-amber-600" />
          <AlertTitle className="text-lg font-bold text-amber-900">Restaurant Currently Closed</AlertTitle>
          <AlertDescription className="mt-2 space-y-2 text-amber-800">
            <p className="font-medium">{restaurantStatus?.message}</p>
            <div className="mt-3 p-3 bg-white rounded-md border border-amber-200">
              <p className="text-sm font-semibold text-amber-900">
                📦 You can still place your order!
              </p>
              <p className="text-sm mt-1">
                Your payment will be processed immediately, and your order will be prepared when we reopen.
              </p>
            </div>
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
          <div className="space-y-1">
            <Label htmlFor="name">Name / Alias <span className="text-destructive">*</span></Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Your name"
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          {/* Phone */}
          <div className="space-y-1">
            <Label htmlFor="phone">Phone Number <span className="text-destructive">*</span></Label>
            <Input
              id="phone"
              {...register('phone')}
              placeholder="08012345678"
              className={errors.phone ? 'border-destructive' : ''}
            />
            {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
          </div>

          {/* Email - optional */}
          <div className="space-y-1">
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
          <div className="space-y-1">
            <Label htmlFor="fullAddress">Delivery Address <span className="text-destructive">*</span></Label>
            <Textarea
              id="fullAddress"
              {...register('fullAddress')}
              placeholder="Full address with landmark"
              rows={2}
              className={errors.fullAddress ? 'border-destructive' : ''}
            />
            {errors.fullAddress && <p className="text-sm text-destructive">{errors.fullAddress.message}</p>}
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
              className="whitespace-nowrap bg-white hover:bg-gray-50 text-red-600 border-red-600 font-semibold flex-shrink-0"
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
