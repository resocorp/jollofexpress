'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '@/store/cart-store';

export function CartArrowIndicator() {
  const [showArrow, setShowArrow] = useState(false);
  const [prevItemCount, setPrevItemCount] = useState(0);
  const itemCount = useCartStore((state) => state.getItemCount());
  const _hasHydrated = useCartStore((state) => state._hasHydrated);

  useEffect(() => {
    if (!_hasHydrated) return;
    
    // Show arrow when item count increases (item added)
    if (itemCount > prevItemCount && prevItemCount >= 0) {
      setShowArrow(true);
      
      // Hide arrow after 3 seconds
      const timer = setTimeout(() => {
        setShowArrow(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
    
    setPrevItemCount(itemCount);
  }, [itemCount, prevItemCount, _hasHydrated]);

  // Update prevItemCount after hydration
  useEffect(() => {
    if (_hasHydrated) {
      setPrevItemCount(itemCount);
    }
  }, [_hasHydrated, itemCount]);

  if (!showArrow || itemCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.5 }}
        className="fixed bottom-36 sm:bottom-24 right-8 sm:right-12 z-50 pointer-events-none"
      >
        {/* Arrow Container */}
        <div className="relative">
          {/* Pulsing Background Glow */}
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute inset-0 bg-[#FF4433] rounded-full blur-xl"
          />

          {/* Main Arrow */}
          <motion.div
            animate={{
              y: [0, 8, 0],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="relative"
          >
            {/* Curved Arrow SVG */}
            <svg
              width="60"
              height="80"
              viewBox="0 0 60 80"
              fill="none"
              className="drop-shadow-2xl"
            >
              {/* Arrow Path */}
              <motion.path
                d="M30 5 L30 55"
                stroke="url(#arrowGradient)"
                strokeWidth="4"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5 }}
              />
              {/* Arrow Head */}
              <motion.path
                d="M15 45 L30 65 L45 45"
                stroke="url(#arrowGradient)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              />
              {/* Gradient Definition */}
              <defs>
                <linearGradient id="arrowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FFD700" />
                  <stop offset="100%" stopColor="#FF4433" />
                </linearGradient>
              </defs>
            </svg>

            {/* "Check it out!" Label */}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="absolute -left-24 top-4 bg-white rounded-lg px-3 py-1.5 shadow-lg border border-gray-100"
            >
              <span className="text-sm font-bold text-[#FF4433] whitespace-nowrap">
                View Cart!
              </span>
              {/* Speech bubble pointer */}
              <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[6px] border-l-white" />
            </motion.div>
          </motion.div>

          {/* Sparkles */}
          <motion.div
            animate={{
              scale: [0, 1, 0],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -top-2 -right-2 text-yellow-400 text-lg"
          >
            ✨
          </motion.div>
          <motion.div
            animate={{
              scale: [0, 1, 0],
              rotate: [0, -180, -360],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5,
            }}
            className="absolute -top-1 -left-3 text-yellow-400 text-sm"
          >
            ✨
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
