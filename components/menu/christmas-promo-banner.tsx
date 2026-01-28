'use client';

import { Clock, Phone, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRestaurantStatus, useRestaurantInfo, useDeliverySettings } from '@/hooks/use-settings';
import { formatCurrency } from '@/lib/formatters';

export function PromoBanner() {
  const { data: status } = useRestaurantStatus();
  const { data: info } = useRestaurantInfo();
  const { data: deliverySettings } = useDeliverySettings();

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
              🌯 THE BEST TASTING SHAWARMA IN TOWN! 🔥
            </h2>
            
            {deliverySettings?.free_delivery_threshold && (
              <p className="text-xs sm:text-sm font-semibold text-white/95 drop-shadow">
                <span className="text-[#FFD700] font-black">*FREE DELIVERY</span> on orders above {formatCurrency(deliverySettings.free_delivery_threshold)}!
              </p>
            )}
            
            <p className="text-[10px] sm:text-xs text-white/90 font-medium">
              🔥 Fresh ingredients • Grilled to perfection • Hot delivery! 🚗
            </p>
          </div>

          {/* Restaurant Info Section - Compact Single Line */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-2 pt-2 border-t border-white/20"
          >
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-white text-xs sm:text-sm">
              {/* Star Rating */}
              <div className="flex items-center gap-1">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <span className="font-semibold">4.8</span>
                <span className="text-white/80">(500+)</span>
              </div>

              <span className="text-white/40">•</span>

              {/* Status Badge */}
              {status?.is_open ? (
                <span className="flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                  Open
                  {status.estimated_prep_time && (
                    <span className="text-white/80">({status.estimated_prep_time} min)</span>
                  )}
                </span>
              ) : (
                <span className="flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                  Closed
                </span>
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

              {/* Last Orders Time */}
              {status?.is_open && status?.next_status_change?.action === 'close' && (
                <>
                  <span className="text-white/40">•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
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
