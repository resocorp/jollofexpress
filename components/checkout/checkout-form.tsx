'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Bike, Store, MapPin, Phone, User, Mail, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { checkoutSchema, type CheckoutFormData } from '@/lib/validations';
import { useCartStore } from '@/store/cart-store';
import { useCreateOrder } from '@/hooks/use-orders';
import { useDeliverySettings, useRestaurantStatus } from '@/hooks/use-settings';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/formatters';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface CheckoutFormProps {
  orderType: 'delivery' | 'carryout';
  onOrderTypeChange: (type: 'delivery' | 'carryout') => void;
}

export function CheckoutForm({ orderType: externalOrderType, onOrderTypeChange }: CheckoutFormProps) {
  const router = useRouter();
  const { items, discount, promoCode, getSubtotal, clearCart } = useCartStore();
  const createOrder = useCreateOrder();
  const { data: deliverySettings, isLoading: isLoadingSettings } = useDeliverySettings();
  const { data: restaurantStatus } = useRestaurantStatus();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      orderType: externalOrderType,
    },
  });

  const orderType = watch('orderType');
  
  // Sync internal form state with external state
  useEffect(() => {
    if (orderType !== externalOrderType) {
      onOrderTypeChange(orderType);
    }
  }, [orderType, externalOrderType, onOrderTypeChange]);
  const subtotal = getSubtotal();
  const taxRate = 7.5;
  const deliveryFee = orderType === 'delivery' ? (deliverySettings?.delivery_fee || 0) : 0;
  const tax = Math.round((subtotal * taxRate) / 100);
  const total = subtotal + tax + deliveryFee - discount;
  const minOrder = deliverySettings?.min_order || 0;
  const isBelowMinimum = orderType === 'delivery' && subtotal < minOrder;

  const onSubmit = async (data: CheckoutFormData) => {
    // Validate minimum order
    if (isBelowMinimum) {
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
            }
          : undefined,
        selected_addons: cartItem.selected_addons.map((addon) => ({
          name: addon.name,
          price: addon.price,
        })),
        special_instructions: cartItem.special_instructions,
        subtotal: cartItem.subtotal,
      }));

      // Create order
      const orderData = {
        customer_name: data.name,
        customer_phone: data.phone,
        customer_email: data.email, // Required for payment processing
        order_type: data.orderType,
        delivery_city: data.orderType === 'delivery' ? 'Awka' : undefined,
        delivery_address: data.orderType === 'delivery' ? data.fullAddress : undefined,
        delivery_instructions: data.deliveryInstructions,
        customer_phone_alt: data.phoneAlt || undefined,
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

      // Clear cart
      clearCart();

      // Redirect to Paystack payment page
      if (result.payment_url) {
        console.log('Redirecting to payment:', result.payment_url);
        window.location.href = result.payment_url;
      } else {
        toast.error('Payment initialization failed. Please contact support with order #' + result.order.order_number);
      }
    } catch (error: any) {
      // Show detailed error to user
      const errorMessage = error.message || error.error || 'Failed to create order';
      
      if (errorMessage.includes('Outside operating hours') || errorMessage.includes('operating hours')) {
        // Restaurant is closed - show detailed message (expected error, no console log)
        const reason = error.response?.details?.reason || 'We are currently closed';
        toast.error('Restaurant Closed', {
          description: reason + '. Please check our operating hours and try again later.',
          duration: 6000,
        });
      } else if (errorMessage.includes('Kitchen at capacity') || errorMessage.includes('capacity')) {
        // Kitchen at max capacity (expected error, no console log)
        const details = error.response?.details;
        toast.error('Kitchen at Capacity', {
          description: `We're currently experiencing high demand${details ? ` (${details.activeOrders}/${details.maxOrders} orders)` : ''}. Please try again in a few minutes.`,
          duration: 6000,
        });
      } else if (errorMessage.includes('Restaurant is currently closed')) {
        // Manually closed (expected error, no console log)
        toast.error('Restaurant Closed', {
          description: 'We are not accepting orders at this time. Please check back during operating hours.',
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

  return (
    <form onSubmit={handleSubmit(onSubmit, handleFormError)} className="space-y-6">
      {/* Restaurant Closed Warning */}
      {!restaurantStatus?.is_open && (
        <Alert variant="destructive" className="border-2 border-red-500 bg-red-50">
          <Clock className="h-5 w-5" />
          <AlertTitle className="text-lg font-bold">Restaurant Currently Closed</AlertTitle>
          <AlertDescription className="mt-2 space-y-2">
            <p className="font-medium">{restaurantStatus?.message}</p>
            {restaurantStatus?.closed_reason && (
              <p className="text-sm">Reason: {restaurantStatus.closed_reason}</p>
            )}
            {restaurantStatus?.hours?.today && (
              <p className="text-sm">Today's Hours: {restaurantStatus.hours.today}</p>
            )}
            {restaurantStatus?.next_status_change?.action === 'open' && (
              <p className="text-sm font-semibold text-green-700">
                Opens at {restaurantStatus.next_status_change.time}
              </p>
            )}
            <p className="text-sm mt-2">
              You can fill out the form, but your order will be rejected when you try to place it.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Order Type Selection */}
      <Card className="border-2 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
              1
            </span>
            Order Type
          </CardTitle>
          <CardDescription className="text-base">Choose how you want to receive your order</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={orderType}
            onValueChange={(value: 'delivery' | 'carryout') => setValue('orderType', value)}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                className={`relative flex items-center space-x-3 rounded-lg border-2 p-4 cursor-pointer transition ${
                  orderType === 'delivery' ? 'border-primary bg-primary/5' : 'border-gray-200'
                }`}
                onClick={() => setValue('orderType', 'delivery')}
              >
                <RadioGroupItem value="delivery" id="delivery" />
                <Label htmlFor="delivery" className="flex items-center gap-3 cursor-pointer flex-1">
                  <Bike className="h-6 w-6" />
                  <div>
                    <p className="font-medium">Delivery</p>
                    <p className="text-sm text-muted-foreground">Delivered to your address</p>
                  </div>
                </Label>
              </div>

              <div
                className={`relative flex items-center space-x-3 rounded-lg border-2 p-4 cursor-pointer transition ${
                  orderType === 'carryout' ? 'border-primary bg-primary/5' : 'border-gray-200'
                }`}
                onClick={() => setValue('orderType', 'carryout')}
              >
                <RadioGroupItem value="carryout" id="carryout" />
                <Label htmlFor="carryout" className="flex items-center gap-3 cursor-pointer flex-1">
                  <Store className="h-6 w-6" />
                  <div>
                    <p className="font-medium">Carryout</p>
                    <p className="text-sm text-muted-foreground">Pick up at restaurant</p>
                  </div>
                </Label>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Delivery Address (only for delivery) */}
      {orderType === 'delivery' && (
        <Card className="border-2 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                2
              </span>
              <MapPin className="h-6 w-6 text-primary" />
              Delivery Address
            </CardTitle>
            <CardDescription className="text-base">
              Provide detailed directions to help our rider find you easily
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Full Address */}
            <div className="space-y-2">
              <Label htmlFor="fullAddress">
                Delivery Address <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="fullAddress"
                {...register('fullAddress')}
                placeholder="10 Ecwa Road, Coker Village, Awka"
                rows={4}
                className={errors.fullAddress ? 'border-destructive' : ''}
              />
              {errors.fullAddress && (
                <p className="text-sm text-destructive">{errors.fullAddress.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Provide your address with nearby landmarks. Our rider will call you for additional directions.
              </p>
            </div>

            {/* Delivery Instructions */}
            <div className="space-y-2">
              <Label htmlFor="deliveryInstructions">Delivery Instructions</Label>
              <Textarea
                id="deliveryInstructions"
                {...register('deliveryInstructions')}
                placeholder="Gate code, call on arrival, ring doorbell, leave at security post, etc."
                rows={2}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground text-right">
                {watch('deliveryInstructions')?.length || 0}/200
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contact Information */}
      <Card className="border-2 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
              {orderType === 'delivery' ? '3' : '2'}
            </span>
            <User className="h-6 w-6 text-primary" />
            Contact Information
          </CardTitle>
          <CardDescription className="text-base">We'll use this to contact you about your order</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Full Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="John Doe"
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Phone Numbers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">
                Phone Number <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  {...register('phone')}
                  placeholder="08012345678"
                  className={`pl-10 ${errors.phone ? 'border-destructive' : ''}`}
                />
              </div>
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                We'll call if we can't find your location
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneAlt">Alternative Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phoneAlt"
                  {...register('phoneAlt')}
                  placeholder="08012345678 (optional)"
                  className={`pl-10 ${errors.phoneAlt ? 'border-destructive' : ''}`}
                />
              </div>
              {errors.phoneAlt && (
                <p className="text-sm text-destructive">{errors.phoneAlt.message}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">
              Email Address <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="john@example.com"
                className={`pl-10 ${errors.email ? 'border-destructive' : ''}`}
              />
            </div>
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Required to process payment and send order confirmation
            </p>
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

      {/* Submit Button */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/menu')}
          disabled={isSubmitting}
          size="lg"
          className="w-full sm:w-auto"
        >
          ← Back to Menu
        </Button>
        <Button 
          type="submit" 
          size="lg" 
          disabled={isSubmitting || isBelowMinimum || isLoadingSettings}
          className="w-full sm:w-auto bg-gradient-to-r from-primary to-orange-600 hover:from-primary/90 hover:to-orange-700 text-white font-bold text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all"
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
    </form>
  );
}
