'use client';

import { useState, useEffect } from 'react';
import { ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '@/store/cart-store';
import { formatCurrency } from '@/lib/formatters';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { CartSheet } from '@/components/cart/cart-sheet';

export function FloatingCartBadge() {
  const itemCount = useCartStore((state) => state.getItemCount());
  const subtotal = useCartStore((state) => state.getSubtotal());
  const discount = useCartStore((state) => state.discount);
  const [mounted, setMounted] = useState(false);
  
  const total = subtotal - discount;

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || itemCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0, opacity: 0, y: 20 }}
        transition={{ duration: 0.3, type: 'spring', stiffness: 200 }}
        className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40"
      >
        <Sheet>
          <SheetTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="group bg-[#FF4433] hover:bg-[#E63320] text-white rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 overflow-hidden touch-manipulation"
              aria-label="View Cart"
            >
              <div className="flex items-center gap-3 py-3 px-4 sm:py-4 sm:px-5">
                {/* Cart Icon with Badge */}
                <div className="relative">
                  <ShoppingBag className="h-6 w-6 sm:h-7 sm:w-7" />
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2 bg-white text-[#FF4433] rounded-full h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center text-xs font-bold shadow-md"
                  >
                    {itemCount}
                  </motion.div>
                </div>

                {/* Price & Text */}
                <div className="flex flex-col items-start min-w-[80px]">
                  <span className="text-xs font-medium opacity-90">View Cart</span>
                  <motion.span
                    key={total}
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-lg sm:text-xl font-bold"
                  >
                    {formatCurrency(total)}
                  </motion.span>
                </div>

                {/* Arrow Indicator */}
                <motion.div
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1, repeat: Infinity, repeatDelay: 1 }}
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </motion.div>
              </div>

              {/* Shimmer Effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: [-200, 200] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              />
            </motion.button>
          </SheetTrigger>

          <SheetContent className="w-full sm:max-w-lg">
            <CartSheet />
          </SheetContent>
        </Sheet>
      </motion.div>
    </AnimatePresence>
  );
}
