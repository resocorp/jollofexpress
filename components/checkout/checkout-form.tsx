'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Bike, Store, MapPin, Phone, User, Mail, Clock, CreditCard, Banknote } from 'lucide-react';
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
import { useDeliveryRegions } from '@/hooks/use-delivery-regions';
import type { DeliveryRegion } from '@/types/database';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/formatters';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LocationPicker } from '@/components/tracking/location-picker';

interface DeliveryRegionsResponse {
  groups: any[];
  ungrouped: DeliveryRegion[];
  all_regions: DeliveryRegion[];
}

interface CheckoutFormProps {
  orderType: 'delivery' | 'carryout';
  onOrderTypeChange: (type: 'delivery' | 'carryout') => void;
  onSubmitExposed?: (submitFn: () => void) => void;
  onSubmittingChange?: (isSubmitting: boolean) => void;
  selectedRegion?: DeliveryRegion | null;
  onRegionChange?: (region: DeliveryRegion | null) => void;
  regionsData?: DeliveryRegionsResponse;
}

export function CheckoutForm({ 
  orderType: externalOrderType, 
  onOrderTypeChange,
  onSubmitExposed,
  onSubmittingChange,
  selectedRegion: externalSelectedRegion,
  onRegionChange,
  regionsData: externalRegionsData
}: CheckoutFormProps) {
  const router = useRouter();
  const { items, discount, promoCode, getSubtotal, setPendingOrder } = useCartStore();
  const createOrder = useCreateOrder();
  const { data: deliverySettings, isLoading: isLoadingSettings } = useDeliverySettings();
  const { data: restaurantStatus } = useRestaurantStatus();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerLocation, setCustomerLocation] = useState<{ latitude: number; longitude: number; address?: string } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'paystack' | 'cod'>('paystack');
  
  // Use external region state if provided, otherwise use internal state
  const [internalSelectedRegion, setInternalSelectedRegion] = useState<DeliveryRegion | null>(null);
  const selectedRegion = externalSelectedRegion !== undefined ? externalSelectedRegion : internalSelectedRegion;
  const setSelectedRegion = onRegionChange || setInternalSelectedRegion;
  
  // Fetch delivery regions if not provided externally
  const { data: fetchedRegionsData, isLoading: isLoadingRegions } = useDeliveryRegions();
  const regionsData = externalRegionsData || fetchedRegionsData;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      orderType: externalOrderType,
    },
  });

  const orderType = watch('orderType');

  // Debug logging for state changes
  useEffect(() => {
    console.log('🔍 CheckoutForm State:', {
      orderType_from_watch: orderType,
      externalOrderType: externalOrderType,
      selectedRegion: selectedRegion?.name || 'null',
      externalSelectedRegion: externalSelectedRegion?.name || 'null',
      timestamp: new Date().toISOString()
    });
  }, [orderType, externalOrderType, selectedRegion, externalSelectedRegion]);

  // Expose submit function to parent - must update when selectedRegion changes
  // to avoid stale closure issues
  useEffect(() => {
    if (onSubmitExposed) {
      onSubmitExposed(() => {
        handleSubmit(onSubmit, handleFormError)();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSubmitExposed, selectedRegion, orderType]);

  // Expose isSubmitting state to parent
  useEffect(() => {
    if (onSubmittingChange) {
      onSubmittingChange(isSubmitting);
    }
  }, [isSubmitting, onSubmittingChange]);

  const subtotal = getSubtotal();
  const taxRate = 7.5;
  
  // Calculate delivery fee based on selected region
  const getDeliveryFee = () => {
    if (orderType !== 'delivery' || !selectedRegion) return 0;
    // Check if cart qualifies for free delivery
    if (selectedRegion.free_delivery_threshold && subtotal >= selectedRegion.free_delivery_threshold) {
      return 0;
    }
    return selectedRegion.delivery_fee;
  };
  
  const deliveryFee = getDeliveryFee();
  const isFreeDelivery = orderType === 'delivery' && selectedRegion?.free_delivery_threshold && subtotal >= selectedRegion.free_delivery_threshold;
  
  // VAT should be applied to subtotal + delivery fee
  const tax = Math.round(((subtotal + deliveryFee) * taxRate) / 100);
  const total = subtotal + tax + deliveryFee - discount;
  const minOrder = deliverySettings?.min_order || 0;
  const isBelowMinimum = orderType === 'delivery' && subtotal < minOrder;
  const isRegionRequired = orderType === 'delivery' && !selectedRegion;

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

      // Validate region selection for delivery
      console.log('🗺️ Region validation:', { 
        orderType: data.orderType, 
        selectedRegion: selectedRegion?.name || 'null',
        externalSelectedRegion: externalSelectedRegion?.name || 'null'
      });
      if (data.orderType === 'delivery' && !selectedRegion) {
        toast.error('Please select your delivery region');
        return;
      }

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
        customer_latitude: customerLocation?.latitude,
        customer_longitude: customerLocation?.longitude,
        delivery_region_id: data.orderType === 'delivery' ? selectedRegion?.id : undefined,
        delivery_region_name: data.orderType === 'delivery' ? selectedRegion?.name : undefined,
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

      // Handle payment based on method
      if (paymentMethod === 'cod') {
        // COD order - redirect to order tracking page
        toast.success('Order placed! Pay with cash when your rider arrives.');
        router.push(`/orders/${result.order.id}?phone=${encodeURIComponent(data.phone)}`);
      } else if (result.payment_url) {
        // Paystack payment - redirect to payment page
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
          <Controller
            name="orderType"
            control={control}
            render={({ field }) => {
              console.log('🎨 Controller Render:', {
                field_value: field.value,
                field_name: field.name,
                orderType_from_watch: orderType
              });
              
              return (
                <RadioGroup 
                  value={field.value} 
                  onValueChange={(value: 'delivery' | 'carryout') => {
                    console.log('📻 RadioGroup onValueChange called:', value);
                    field.onChange(value);
                    onOrderTypeChange(value);
                  }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Label
                      htmlFor="delivery"
                      className={`relative flex items-center space-x-3 rounded-lg border-2 p-4 cursor-pointer transition ${
                        field.value === 'delivery' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <RadioGroupItem value="delivery" id="delivery" />
                      <div className="flex items-center gap-3 flex-1">
                        <Bike className="h-6 w-6" />
                        <div>
                          <p className="font-medium">Delivery</p>
                          <p className="text-sm text-muted-foreground">Delivered to your address</p>
                        </div>
                      </div>
                    </Label>

                    <Label
                      htmlFor="carryout"
                      className={`relative flex items-center space-x-3 rounded-lg border-2 p-4 cursor-pointer transition ${
                        field.value === 'carryout' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <RadioGroupItem value="carryout" id="carryout" />
                      <div className="flex items-center gap-3 flex-1">
                        <Store className="h-6 w-6" />
                        <div>
                          <p className="font-medium">Carryout</p>
                          <p className="text-sm text-muted-foreground">Pick up at restaurant</p>
                        </div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              );
            }}
          />
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
            {/* Selected Delivery Region Display (read-only) */}
            {selectedRegion ? (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="font-medium">{selectedRegion.name}</span>
                  </div>
                  {isFreeDelivery ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm line-through text-muted-foreground">
                        {formatCurrency(selectedRegion.delivery_fee)}
                      </span>
                      <span className="text-sm font-bold text-green-600">FREE</span>
                    </div>
                  ) : (
                    <span className="font-bold">{formatCurrency(selectedRegion.delivery_fee)}</span>
                  )}
                </div>
                {isFreeDelivery && (
                  <p className="text-xs text-green-600 mt-2">
                    🎉 You qualify for free delivery!
                  </p>
                )}
                {selectedRegion.free_delivery_threshold && !isFreeDelivery && (
                  <p className="text-xs text-muted-foreground mt-2">
                    💡 Add {formatCurrency(selectedRegion.free_delivery_threshold - subtotal)} more for free delivery!
                  </p>
                )}
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-700 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Please select your delivery area in the cart first.
                </p>
              </div>
            )}

            {/* Full Address with Landmark */}
            <div className="space-y-2">
              <Label htmlFor="fullAddress">
                Delivery Address <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="fullAddress"
                {...register('fullAddress')}
                placeholder="10 Ecwa Road, Coker Village, Awka (near Total Filling Station)"
                rows={3}
                className={errors.fullAddress ? 'border-destructive' : ''}
              />
              {errors.fullAddress && (
                <p className="text-sm text-destructive">{errors.fullAddress.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                📍 Include a nearby landmark (e.g., "near Shoprite", "opposite First Bank") to help our rider find you faster.
              </p>
            </div>

            {/* GPS Location Picker */}
            <LocationPicker
              onLocationSelect={setCustomerLocation}
              initialLocation={customerLocation || undefined}
            />
            {customerLocation && (
              <p className="text-xs text-green-600 flex items-center gap-1 mt-2">
                <MapPin className="h-3 w-3" /> GPS location saved for accurate delivery
              </p>
            )}
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

      {/* Payment Method Selection */}
      <Card className="border-2 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
              {orderType === 'delivery' ? '4' : '3'}
            </span>
            <CreditCard className="h-6 w-6 text-primary" />
            Payment Method
          </CardTitle>
          <CardDescription className="text-base">Choose how you want to pay</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup 
            value={paymentMethod} 
            onValueChange={(value: 'paystack' | 'cod') => setPaymentMethod(value)}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Label
                htmlFor="payment-paystack"
                className={`relative flex items-center space-x-3 rounded-lg border-2 p-4 cursor-pointer transition ${
                  paymentMethod === 'paystack' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <RadioGroupItem value="paystack" id="payment-paystack" />
                <div className="flex items-center gap-3 flex-1">
                  <CreditCard className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="font-medium">Pay Online</p>
                    <p className="text-sm text-muted-foreground">Card, Bank Transfer, USSD</p>
                  </div>
                </div>
              </Label>

              {orderType === 'delivery' && (
                <Label
                  htmlFor="payment-cod"
                  className={`relative flex items-center space-x-3 rounded-lg border-2 p-4 cursor-pointer transition ${
                    paymentMethod === 'cod' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <RadioGroupItem value="cod" id="payment-cod" />
                  <div className="flex items-center gap-3 flex-1">
                    <Banknote className="h-6 w-6 text-amber-600" />
                    <div>
                      <p className="font-medium">Cash on Delivery</p>
                      <p className="text-sm text-muted-foreground">Pay when your order arrives</p>
                    </div>
                  </div>
                </Label>
              )}
            </div>
          </RadioGroup>
          
          {paymentMethod === 'cod' && (
            <Alert className="mt-4 border-amber-200 bg-amber-50">
              <Banknote className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                Please have exact cash ready. Our riders may have limited change.
              </AlertDescription>
            </Alert>
          )}
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
