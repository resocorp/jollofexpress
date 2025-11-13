'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { CheckoutForm } from '@/components/checkout/checkout-form';
import { OrderSummaryWithButton } from '@/components/checkout/order-summary';
import { useCartStore } from '@/store/cart-store';
import { useDeliverySettings } from '@/hooks/use-settings';
import { ShoppingBag, Shield, Lock, Truck, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const getSubtotal = useCartStore((state) => state.getSubtotal);
  const { data: deliverySettings, isLoading: isLoadingSettings } = useDeliverySettings();
  const [orderType, setOrderType] = useState<'delivery' | 'carryout'>('delivery');
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

  // Redirect to menu if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      router.push('/menu');
    }
  }, [items, router]);

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <Header />
      
      {/* Progress Bar */}
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-semibold text-sm">
                ✓
              </div>
              <span className="text-sm font-medium text-green-600">Cart</span>
            </div>
            <div className="flex-1 h-1 bg-primary mx-4 rounded-full" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-semibold text-sm">
                2
              </div>
              <span className="text-sm font-medium text-primary">Checkout</span>
            </div>
            <div className="flex-1 h-1 bg-gray-200 mx-4 rounded-full" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 font-semibold text-sm">
                3
              </div>
              <span className="text-sm font-medium text-gray-400">Payment</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-orange-600 to-red-600 bg-clip-text text-transparent mb-3">
            Complete Your Order
          </h1>
          <p className="text-muted-foreground text-lg">
            Just a few more details and your delicious meal will be on its way!
          </p>
        </motion.div>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-wrap justify-center gap-4 mb-8"
        >
          <Badge variant="outline" className="px-4 py-2 text-sm font-medium border-green-500/30 bg-green-50">
            <Shield className="h-4 w-4 mr-2 text-green-600" />
            Secure Checkout
          </Badge>
          <Badge variant="outline" className="px-4 py-2 text-sm font-medium border-blue-500/30 bg-blue-50">
            <Lock className="h-4 w-4 mr-2 text-blue-600" />
            SSL Encrypted
          </Badge>
          <Badge variant="outline" className="px-4 py-2 text-sm font-medium border-orange-500/30 bg-orange-50">
            <Truck className="h-4 w-4 mr-2 text-orange-600" />
            Fast Delivery
          </Badge>
          <Badge variant="outline" className="px-4 py-2 text-sm font-medium border-purple-500/30 bg-purple-50">
            <Clock className="h-4 w-4 mr-2 text-purple-600" />
            30 Min Guarantee
          </Badge>
        </motion.div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <CheckoutForm 
              orderType={orderType} 
              onOrderTypeChange={setOrderType}
              onSubmitExposed={handleSubmitExposed}
              onSubmittingChange={setIsSubmitting}
            />
          </motion.div>
          
          {/* Order Summary with Button */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="lg:col-span-1"
          >
            <div className="sticky top-24">
              <OrderSummaryWithButton 
                orderType={orderType}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                isBelowMinimum={isBelowMinimum}
                isLoadingSettings={isLoadingSettings}
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
