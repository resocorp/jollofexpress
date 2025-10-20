'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { CheckoutForm } from '@/components/checkout/checkout-form';
import { OrderSummary } from '@/components/checkout/order-summary';
import { useCartStore } from '@/store/cart-store';
import { ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);

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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <CheckoutForm />
          </div>
          
          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-20">
              <OrderSummary />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
