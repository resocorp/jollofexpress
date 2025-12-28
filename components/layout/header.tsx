'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingCart, Menu } from 'lucide-react';
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
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Prevent hydration mismatch by only showing cart count after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm">
      <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4 max-w-[1400px]">
        {/* Left: Menu Icon */}
        <div className="flex items-center w-20 sm:w-24">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-9 w-9 sm:h-10 sm:w-10 p-0 touch-manipulation"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            aria-label="Menu"
          >
            <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>
        </div>

        {/* Center: Logo */}
        <Link href="/menu" className="flex items-center space-x-1.5 sm:space-x-2 absolute left-1/2 transform -translate-x-1/2">
          {info?.logo_url ? (
            <img 
              src={info.logo_url} 
              alt={info.name || 'Restaurant Logo'} 
              className="h-8 w-8 sm:h-10 sm:w-10 object-cover rounded-full"
            />
          ) : (
            <div className="flex items-center justify-center h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-[#FF4433] text-white font-bold text-sm sm:text-base">
              US
            </div>
          )}
          <span className="font-bold text-lg sm:text-xl hidden md:inline-block">
            {info?.name || "Ur' Shawarma Express"}
          </span>
        </Link>

        {/* Right: Cart */}
        <div className="flex items-center w-20 sm:w-24 justify-end">
          {/* Cart Button */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="relative h-9 w-9 sm:h-10 sm:w-10 p-0 touch-manipulation">
                <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
                {mounted && itemCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 h-5 w-5 sm:h-6 sm:w-6 rounded-full p-0 flex items-center justify-center text-[10px] sm:text-xs font-bold"
                  >
                    {itemCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-lg">
              <CartSheet />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {showMobileMenu && (
        <div className="border-t bg-white">
          <div className="container mx-auto px-4 py-3 space-y-2">
            <Link 
              href="/menu" 
              className="block py-2 px-3 hover:bg-gray-100 rounded-lg font-medium transition-colors"
              onClick={() => setShowMobileMenu(false)}
            >
              🏠 Home
            </Link>
            <Link 
              href="/orders" 
              className="block py-2 px-3 hover:bg-gray-100 rounded-lg font-medium transition-colors"
              onClick={() => setShowMobileMenu(false)}
            >
              📋 My Orders
            </Link>
            <Link 
              href="/about" 
              className="block py-2 px-3 hover:bg-gray-100 rounded-lg font-medium transition-colors"
              onClick={() => setShowMobileMenu(false)}
            >
              ℹ️ About Us
            </Link>
            <Link 
              href="/contact" 
              className="block py-2 px-3 hover:bg-gray-100 rounded-lg font-medium transition-colors"
              onClick={() => setShowMobileMenu(false)}
            >
              📞 Contact
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
