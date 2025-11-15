'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCartStore } from '@/store/cart-store';
import { useRestaurantInfo } from '@/hooks/use-settings';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { CartSheet } from '@/components/cart/cart-sheet';

export function Header() {
  const itemCount = useCartStore((state) => state.getItemCount());
  const { data: info } = useRestaurantInfo();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only showing cart count after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4">
        {/* Logo */}
        <Link href="/menu" className="flex items-center space-x-1.5 sm:space-x-2">
          {info?.logo_url ? (
            <img 
              src={info.logo_url} 
              alt={info.name || 'Restaurant Logo'} 
              className="h-8 w-8 sm:h-10 sm:w-10 object-cover rounded-full"
            />
          ) : (
            <div className="flex items-center justify-center h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-orange-500 text-white font-bold text-sm sm:text-base">
              JE
            </div>
          )}
          <span className="font-bold text-lg sm:text-xl hidden sm:inline-block">
            {info?.name || 'JollofExpress'}
          </span>
        </Link>

        {/* Cart Only */}
        <div className="flex items-center">
          {/* Cart Button */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="relative h-9 sm:h-10 touch-manipulation">
                <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                {mounted && itemCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 h-4 w-4 sm:h-5 sm:w-5 rounded-full p-0 flex items-center justify-center text-[10px] sm:text-xs"
                  >
                    {itemCount}
                  </Badge>
                )}
                <span className="ml-1.5 sm:ml-2 hidden sm:inline text-sm">Cart</span>
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
