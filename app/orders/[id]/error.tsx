'use client';

import { useEffect } from 'react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function OrderError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console for debugging
    console.error('Order page error:', error);
    
    // Check if it's a chunk loading error (common after deployments)
    if (error.message?.includes('ChunkLoadError') || error.message?.includes('Loading chunk')) {
      console.log('Chunk loading error detected - likely caused by deployment. Will reload page.');
    }
  }, [error]);

  // Check if it's a chunk loading error
  const isChunkError = error.message?.includes('ChunkLoadError') || 
                       error.message?.includes('Loading chunk') ||
                       error.name === 'ChunkLoadError';

  const handleReload = () => {
    // Force a full page reload to get fresh chunks
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">
              {isChunkError ? 'Page Update Required' : 'Something went wrong'}
            </h2>
            <p className="text-muted-foreground mb-6">
              {isChunkError 
                ? "We've recently updated our app. Please refresh to load the latest version."
                : "We encountered an error loading your order. Please try again."
              }
            </p>
            <div className="space-y-3">
              <Button onClick={handleReload} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Page
              </Button>
              <Link href="/menu">
                <Button variant="outline" className="w-full">
                  <Home className="h-4 w-4 mr-2" />
                  Back to Menu
                </Button>
              </Link>
            </div>
            {!isChunkError && (
              <p className="text-xs text-muted-foreground mt-4">
                If this problem persists, please contact support.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
