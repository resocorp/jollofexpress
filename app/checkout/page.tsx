'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { CheckoutForm } from '@/components/checkout/checkout-form';
import { OrderSummaryWithButton } from '@/components/checkout/order-summary';
import { useCartStore } from '@/store/cart-store';
import { useDeliverySettings } from '@/hooks/use-settings';
import { ShoppingBag, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const hasHydrated = useCartStore((state) => state._hasHydrated);
  const getSubtotal = useCartStore((state) => state.getSubtotal);
  const { data: deliverySettings, isLoading: isLoadingSettings } = useDeliverySettings();
  const [orderType] = useState<'delivery' | 'carryout'>('delivery');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitFormRef = useRef<(() => void) | null>(null);

  const subtotal = getSubtotal();
  const minOrder = deliverySettings?.min_order || 0;
  const isBelowMinimum = orderType === 'delivery' && subtotal < minOrder;

  const handleSubmitExposed = useCallback((fn: () => void) => {
    submitFormRef.current = fn;
  }, []);

  const handleSubmit = useCallback(() => {
    if (submitFormRef.current) {
      submitFormRef.current();
    }
  }, []);

  // Redirect to menu if cart is empty (only after hydration completes)
  useEffect(() => {
    // Wait for store to hydrate from localStorage before checking cart
    if (hasHydrated && items.length === 0) {
      router.push('/menu');
    }
  }, [items, router, hasHydrated]);

  // Show loading while hydrating to prevent flash of empty cart
  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">Loading checkout...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-md mx-auto text-center">
            <ShoppingBag className="h-24 w-24 mx-auto text-muted-foreground/30 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-6">Add some items to proceed with checkout</p>
            <Link href="/menu">
              <Button>Browse Menu</Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">Checkout</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <CheckoutForm 
              onSubmitExposed={handleSubmitExposed}
              onSubmittingChange={setIsSubmitting}
            />
          </div>
          
          {/* Order Summary with Button */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <OrderSummaryWithButton 
                orderType={orderType}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                isBelowMinimum={isBelowMinimum}
                isLoadingSettings={isLoadingSettings}
              />
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
