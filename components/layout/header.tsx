'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingCart, Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCartStore } from '@/store/cart-store';
import { useRestaurantStatus, useRestaurantInfo } from '@/hooks/use-settings';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { CartSheet } from '@/components/cart/cart-sheet';

export function Header() {
  const itemCount = useCartStore((state) => state.getItemCount());
  const { data: status } = useRestaurantStatus();
  const { data: info } = useRestaurantInfo();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only showing cart count after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/menu" className="flex items-center space-x-2">
          {info?.logo_url ? (
            <img 
              src={info.logo_url} 
              alt={info.name || 'Restaurant Logo'} 
              className="h-10 w-10 object-cover rounded-full"
            />
          ) : (
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-orange-500 text-white font-bold">
              JE
            </div>
          )}
          <span className="font-bold text-xl hidden sm:inline-block">
            {info?.name || 'JollofExpress'}
          </span>
        </Link>

        {/* Status Info */}
        <div className="flex items-center gap-4">
          {/* Restaurant Status */}
          <div className="hidden md:flex items-center gap-2 text-sm">
            {status?.is_open ? (
              <>
                <Clock className="h-4 w-4 text-green-600" />
                <span className="text-green-600 font-medium">Open</span>
                <span className="text-muted-foreground">
                  • {status.estimated_prep_time} min
                </span>
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 text-red-600" />
                <span className="text-red-600 font-medium">Closed</span>
              </>
            )}
          </div>

          {/* Delivery Location */}
          <div className="hidden md:flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>Awka</span>
          </div>

          {/* Cart Button */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {mounted && itemCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center"
                  >
                    {itemCount}
                  </Badge>
                )}
                <span className="ml-2 hidden sm:inline">Cart</span>
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-lg">
              <CartSheet />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
