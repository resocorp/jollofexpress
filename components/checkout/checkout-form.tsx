'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Bike, Store, MapPin, Phone, User, Mail, Home } from 'lucide-react';
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
import { toast } from 'sonner';

export function CheckoutForm() {
  const router = useRouter();
  const { items, discount, promoCode, getSubtotal, clearCart } = useCartStore();
  const createOrder = useCreateOrder();
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
      orderType: 'delivery',
      city: 'Awka',
    },
  });

  const orderType = watch('orderType');
  const subtotal = getSubtotal();
  const taxRate = 7.5;
  const deliveryFee = orderType === 'delivery' ? 200 : 0;
  const tax = Math.round((subtotal * taxRate) / 100);
  const total = subtotal + tax + deliveryFee - discount;

  const onSubmit = async (data: CheckoutFormData) => {
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
        customer_email: data.email || undefined,
        order_type: data.orderType,
        delivery_city: data.orderType === 'delivery' ? data.city : undefined,
        delivery_address: data.orderType === 'delivery' ? data.fullAddress : undefined,
        address_type: data.addressType,
        unit_number: data.unitNumber,
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

      // Clear cart
      clearCart();

      // Redirect to Paystack payment page
      if (result.payment_url) {
        window.location.href = result.payment_url;
      } else {
        toast.error('Payment initialization failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Order Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Order Type</CardTitle>
          <CardDescription>Choose how you want to receive your order</CardDescription>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Delivery Address
            </CardTitle>
            <CardDescription>
              Provide detailed directions to help our rider find you easily
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* City Selection */}
            <div className="space-y-2">
              <Label htmlFor="city">
                City <span className="text-destructive">*</span>
              </Label>
              <Select value={watch('city')} onValueChange={(value) => setValue('city', value)}>
                <SelectTrigger id="city">
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Awka">Awka</SelectItem>
                  {/* Future cities can be added here */}
                </SelectContent>
              </Select>
              {errors.city && (
                <p className="text-sm text-destructive">{errors.city.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                We currently only deliver within Awka
              </p>
            </div>

            {/* Full Address */}
            <div className="space-y-2">
              <Label htmlFor="fullAddress">
                Full Address with Directions <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="fullAddress"
                {...register('fullAddress')}
                placeholder="Enter your full address with clear directions and landmarks. Example: No. 12 Zik Avenue, opposite First Bank, near Aroma Junction, Awka"
                rows={4}
                className={errors.fullAddress ? 'border-destructive' : ''}
              />
              {errors.fullAddress && (
                <p className="text-sm text-destructive">{errors.fullAddress.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Be as specific as possible. Include street name, house number, nearby landmarks, and any directions. Minimum 20 characters.
              </p>
            </div>

            {/* Address Type & Unit Number */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="addressType">Address Type</Label>
                <Select
                  value={watch('addressType')}
                  onValueChange={(value: any) => setValue('addressType', value)}
                >
                  <SelectTrigger id="addressType">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="house">
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4" />
                        House
                      </div>
                    </SelectItem>
                    <SelectItem value="office">Office</SelectItem>
                    <SelectItem value="hotel">Hotel</SelectItem>
                    <SelectItem value="church">Church</SelectItem>
                    <SelectItem value="school">School</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Helps rider know what to expect
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="unitNumber">Unit/Apartment Number</Label>
                <Input
                  id="unitNumber"
                  {...register('unitNumber')}
                  placeholder="e.g., Flat 3, Room 205"
                />
                <p className="text-xs text-muted-foreground">Optional</p>
              </div>
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Contact Information
          </CardTitle>
          <CardDescription>We'll use this to contact you about your order</CardDescription>
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
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="john@example.com (optional)"
                className={`pl-10 ${errors.email ? 'border-destructive' : ''}`}
              />
            </div>
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              We'll send order confirmation to this email
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/menu')}
          disabled={isSubmitting}
        >
          Back to Menu
        </Button>
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Proceed to Payment
        </Button>
      </div>
    </form>
  );
}
