'use client';

import { Phone, Timer } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRestaurantInfo, useDeliverySettings } from '@/hooks/use-settings';
import { useOrderWindow } from '@/hooks/use-order-window';
import { formatCurrency } from '@/lib/formatters';

export function PromoBanner() {
  const { data: info } = useRestaurantInfo();
  const { data: deliverySettings } = useDeliverySettings();
  const {
    isAccepting,
    isPreorder,
    nextBatch,
    deliveryDate,
    deliveryWindow,
    countdownFormatted,
    secondsUntilCutoff,
    message,
    isLoading,
    restaurantClosed,
  } = useOrderWindow();

  // Determine status indicator color and label
  const getStatusIndicator = () => {
    if (restaurantClosed) {
      return { color: 'bg-red-400', pulse: false, label: 'Closed' };
    }
    if (isAccepting) {
      return { color: 'bg-green-400', pulse: true, label: 'Order Now' };
    }
    if (isPreorder) {
      return { color: 'bg-yellow-400', pulse: false, label: 'Pre-ordering' };
    }
    return { color: 'bg-yellow-400', pulse: false, label: 'Batch in Progress' };
  };

  const statusIndicator = getStatusIndicator();

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden bg-gradient-to-r from-[#C41E3A] via-[#D32F2F] to-[#C41E3A] border-b-4 border-[#FFD700]"
    >
        {/* Main Content */}
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-3 max-w-[1400px]">
          {/* Main Promo Text */}
          <div className="text-center space-y-1">
            <h2 className="text-lg sm:text-xl md:text-2xl font-black text-white drop-shadow-md tracking-tight">
              🌯 THE BEST TASTING SHAWARMA IN AWKA! 🔥
            </h2>
            
            {/* Batch delivery info line */}
            {deliveryWindow ? (
              <p className="text-xs sm:text-sm font-semibold text-white/95 drop-shadow">
                {restaurantClosed ? (
                  <>
                    <span className="font-bold">We&apos;re closed</span> · Next delivery: {deliveryDate} {deliveryWindow}
                  </>
                ) : (
                  <>
                    <span className="font-bold">Fresh batch daily</span> · Delivered hot between {deliveryWindow}
                  </>
                )}
              </p>
            ) : null}

            {deliverySettings?.free_delivery_threshold && (
              <p className="text-[10px] sm:text-xs text-white/90 font-medium">
                <span className="text-[#FFD700] font-black">FREE DELIVERY</span> on orders above {formatCurrency(deliverySettings.free_delivery_threshold)}
                {isAccepting && deliveryWindow ? ` · Order before cutoff today!` : ''}
              </p>
            )}
          </div>

          {/* Smart Status Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-2 pt-2 border-t border-white/20"
          >
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-white text-xs sm:text-sm">
              {/* Smart Status Badge */}
              {!isLoading && (
                <span className="flex items-center gap-1.5 font-medium">
                  <span className={`w-1.5 h-1.5 ${statusIndicator.color} rounded-full ${statusIndicator.pulse ? 'animate-pulse' : ''}`}></span>
                  {statusIndicator.label}
                </span>
              )}

              {/* Delivery Window */}
              {deliveryWindow && (
                <>
                  <span className="text-white/40">•</span>
                  <span className="font-medium">
                    {restaurantClosed ? 'Next' : ''} Delivery: {deliveryDate} {deliveryWindow}
                  </span>
                </>
              )}

              {/* Order Cutoff Countdown */}
              {isAccepting && secondsUntilCutoff > 0 && (
                <>
                  <span className="text-white/40">•</span>
                  <span className="flex items-center gap-1 text-[#FFD700] font-bold">
                    <Timer className="h-3 w-3" />
                    Order before {nextBatch?.cutoffTime || countdownFormatted} ({countdownFormatted} left)
                  </span>
                </>
              )}

              {/* Phone */}
              {info?.phone && (
                <>
                  <span className="text-white/40">•</span>
                  <a 
                    href={`tel:${info.phone}`}
                    className="flex items-center gap-1 hover:text-yellow-300 transition-colors touch-manipulation"
                  >
                    <Phone className="h-3 w-3" />
                    <span className="hidden sm:inline">{info.phone}</span>
                    <span className="sm:hidden">Call</span>
                  </a>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>
  );
}
