'use client';

import { Gift, Sparkles, Clock, Phone, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useRestaurantStatus, useRestaurantInfo } from '@/hooks/use-settings';
import { useMenu } from '@/hooks/use-menu';
import { useCartStore } from '@/store/cart-store';
import { toast } from 'sonner';

export function ChristmasPromoBanner() {
  const { data: status } = useRestaurantStatus();
  const { data: info } = useRestaurantInfo();
  const { data: menu } = useMenu();
  const addItem = useCartStore((state) => state.addItem);

  // Get first menu item for Order Now button
  const firstMenuItem = menu?.categories?.[0]?.items?.[0];

  const handleOrderNow = () => {
    if (firstMenuItem) {
      addItem(firstMenuItem, 1, undefined, []);
      toast.success(`${firstMenuItem.name} added to cart!`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden bg-gradient-to-r from-[#C41E3A] via-[#D32F2F] to-[#C41E3A] border-b-4 border-[#FFD700]"
    >
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Snowflakes */}
          <motion.div
            animate={{
              y: [0, 100, 0],
              x: [0, 20, 0],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute top-0 left-[10%] text-white/20 text-2xl"
          >
            ❄️
          </motion.div>
          <motion.div
            animate={{
              y: [0, 120, 0],
              x: [0, -15, 0],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "linear",
              delay: 2
            }}
            className="absolute top-0 left-[30%] text-white/20 text-xl"
          >
            ❄️
          </motion.div>
          <motion.div
            animate={{
              y: [0, 90, 0],
              x: [0, 25, 0],
            }}
            transition={{
              duration: 9,
              repeat: Infinity,
              ease: "linear",
              delay: 4
            }}
            className="absolute top-0 right-[20%] text-white/20 text-2xl"
          >
            ❄️
          </motion.div>
          <motion.div
            animate={{
              y: [0, 110, 0],
              x: [0, -20, 0],
            }}
            transition={{
              duration: 11,
              repeat: Infinity,
              ease: "linear",
              delay: 1
            }}
            className="absolute top-0 right-[5%] text-white/20 text-xl"
          >
            ❄️
          </motion.div>

          {/* Sparkles */}
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute top-4 left-8 text-yellow-300"
          >
            ✨
          </motion.div>
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: 1 }}
            className="absolute bottom-4 right-16 text-yellow-300"
          >
            ✨
          </motion.div>
        </div>

        {/* Main Content */}
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 max-w-[1400px]">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Gift Icon */}
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              className="hidden sm:block"
            >
              <div className="relative">
                <Gift className="h-12 w-12 sm:h-16 sm:w-16 text-white drop-shadow-lg" />
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute -top-1 -right-1"
                >
                  <Sparkles className="h-5 w-5 text-yellow-300" />
                </motion.div>
              </div>
            </motion.div>

            {/* Center: Text Content */}
            <div className="flex-1 text-center space-y-2">
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white drop-shadow-md tracking-tight">
                  🌯 THE BEST TASTING SHAWARMA IN TOWN! 🔥
                </h2>
              </motion.div>
              
              <p className="text-sm sm:text-base md:text-lg font-semibold text-white/95 drop-shadow">
                <span className="text-[#FFD700] font-black text-base sm:text-lg md:text-xl">*FREE DELIVERY</span> on orders above ₦5,000!
              </p>
              
              <p className="text-xs sm:text-sm text-white/90 font-medium">
                🔥 Fresh ingredients • Grilled to perfection • Hot delivery! 🚗
              </p>
            </div>

            {/* Right: CTA Button */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                size="lg"
                onClick={handleOrderNow}
                className="hidden sm:flex bg-white hover:bg-yellow-50 text-[#D32F2F] font-bold shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-[#FFD700] min-h-[44px] touch-manipulation"
              >
                <Gift className="h-5 w-5 mr-2" />
                Order Now!
              </Button>

              {/* Mobile CTA */}
              <Button
                size="sm"
                onClick={handleOrderNow}
                className="sm:hidden bg-white hover:bg-yellow-50 text-[#D32F2F] font-bold shadow-lg text-xs min-h-[40px] touch-manipulation"
              >
                Order
              </Button>
            </div>
          </div>

          {/* Mobile: Full-width CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-3 sm:hidden"
          >
            <Button
              size="lg"
              onClick={handleOrderNow}
              className="w-full bg-white hover:bg-yellow-50 text-[#D32F2F] font-bold shadow-lg border-2 border-[#FFD700] min-h-[44px] touch-manipulation"
            >
              <Gift className="h-4 w-4 mr-2" />
              Order Now & Get FREE Delivery!
            </Button>
          </motion.div>

          {/* Restaurant Info Section - Single Line */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-4 pt-4 border-t border-white/20"
          >
            {/* Single line with all info */}
            <div className="flex flex-wrap items-center gap-3 text-white text-sm">
              {/* Description */}
              <p className="font-semibold text-base sm:text-lg">
                {info?.description || "Delicious Nigerian cuisine delivered to your doorstep"}
              </p>
              
              {/* Star Rating */}
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <span className="font-semibold">4.8</span>
                <span className="text-white/90">(500+)</span>
              </div>

              <span className="text-white/40">•</span>

              {/* Status Badge */}
              {status?.is_open ? (
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  Open
                  {status.estimated_prep_time && (
                    <span className="text-white/80">({status.estimated_prep_time} min)</span>
                  )}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                  Closed
                  {status?.hours?.today && (
                    <span className="text-white/80">• Hours: {status.hours.today}</span>
                  )}
                </span>
              )}

              {/* Phone */}
              {info?.phone && (
                <>
                  <span className="text-white/40">•</span>
                  <a 
                    href={`tel:${info.phone}`}
                    className="flex items-center gap-1.5 font-normal hover:text-yellow-300 transition-colors touch-manipulation"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{info.phone}</span>
                    <span className="sm:hidden">Call</span>
                  </a>
                </>
              )}

              {/* Last Orders Time */}
              {status?.is_open && status?.next_status_change?.action === 'close' && (
                <>
                  <span className="text-white/40">•</span>
                  <span className="flex items-center gap-1.5 font-normal">
                    <Clock className="h-3.5 w-3.5" />
                    Last orders at {status.next_status_change.time}
                  </span>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>
  );
}
