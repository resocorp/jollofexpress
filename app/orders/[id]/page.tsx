'use client';

import { use, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { OrderTracker } from '@/components/orders/order-tracker';
import { OrderDetails } from '@/components/orders/order-details';
import { useOrder, useVerifyPayment } from '@/hooks/use-orders';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { toast } from 'sonner';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function OrderTrackingPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference');
  const phone = searchParams.get('phone');
  
  const [isVerifying, setIsVerifying] = useState(!!reference);
  const { data: order, isLoading, error } = useOrder(resolvedParams.id, phone || undefined);
  const verifyPayment = useVerifyPayment();

  // Verify payment if coming from Paystack redirect
  useEffect(() => {
    if (reference && resolvedParams.id) {
      setIsVerifying(true);
      verifyPayment
        .mutateAsync({
          orderId: resolvedParams.id,
          reference,
        })
        .then(() => {
          toast.success('Payment verified successfully!');
        })
        .catch((error: any) => {
          toast.error(error.message || 'Payment verification failed');
        })
        .finally(() => {
          setIsVerifying(false);
        });
    }
  }, [reference, resolvedParams.id]);

  if (isLoading || isVerifying) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">
              {isVerifying ? 'Verifying payment...' : 'Loading order...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Order Not Found</h2>
              <p className="text-muted-foreground mb-6">
                We couldn't find the order you're looking for.
              </p>
              <Link href="/menu">
                <Button>Back to Menu</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show payment failed message
  if (order.payment_status === 'failed') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Payment Failed</h2>
              <p className="text-muted-foreground mb-6">
                Your payment could not be processed. Please try again.
              </p>
              <div className="space-y-2">
                <Link href="/menu">
                  <Button className="w-full">Back to Menu</Button>
                </Link>
                <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
                  Retry Payment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show order tracking
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Success Message (only on first load after payment) */}
        {reference && order.payment_status === 'success' && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <CheckCircle2 className="h-12 w-12 text-green-600 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-green-900">Order Confirmed!</h3>
                  <p className="text-green-800">
                    Your payment was successful. We're preparing your order now.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Tracker */}
          <div className="lg:col-span-2">
            <OrderTracker order={order} />
          </div>
          
          {/* Order Details */}
          <div className="lg:col-span-1">
            <OrderDetails order={order} />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 text-center">
          <Link href="/menu">
            <Button variant="outline">Order More Food</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
