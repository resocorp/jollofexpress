'use client';

import { Clock, MapPin, Phone, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useRestaurantStatus, useRestaurantInfo } from '@/hooks/use-settings';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function EnhancedBanner() {
  const { data: status } = useRestaurantStatus();
  const { data: info } = useRestaurantInfo();

  const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-orange-500 via-red-500 to-rose-600">
      {/* Subtle Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:24px_24px]" />
      
      {/* Gradient Overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10" />

      {/* Main Content */}
      <motion.div 
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="relative container mx-auto px-4 py-5 md:py-6"
      >
        <div className="max-w-5xl">
          {/* Single Compact Row */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {/* Description */}
            <motion.p variants={item} className="text-base md:text-lg text-white font-medium">
              {info?.description || 'Authentic Nigerian cuisine delivered to your doorstep'}
            </motion.p>
            
            {/* Divider */}
            <span className="hidden sm:inline text-white/30">|</span>

            {/* Ratings */}
            <motion.div variants={item} className="flex items-center gap-2 text-white">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="font-semibold text-sm">4.8</span>
              <span className="text-sm text-white/90">(500+)</span>
            </motion.div>

            {/* Divider */}
            <span className="hidden lg:inline text-white/30">|</span>

            {/* Status & Quick Info */}
            <motion.div variants={item} className="flex flex-wrap items-center gap-2.5 text-white text-sm">
              {/* Open/Closed Status */}
              <Badge 
                variant={status?.is_open ? 'default' : 'destructive'} 
                className={cn(
                  "text-xs px-3 py-1 font-semibold",
                  status?.is_open 
                    ? "bg-green-500 hover:bg-green-600 text-white" 
                    : "bg-red-500/90 hover:bg-red-600"
                )}
              >
                <Clock className="h-3 w-3 mr-1" />
                {status?.is_open ? 'Open' : 'Closed'}
              </Badge>

              {/* Prep Time */}
              {status?.is_open && status.estimated_prep_time && (
                <span className="flex items-center gap-1 font-medium">
                  <Clock className="h-3.5 w-3.5" />
                  {status.estimated_prep_time} min
                </span>
              )}

              {/* Location */}
              <span className="flex items-center gap-1 font-medium">
                <MapPin className="h-3.5 w-3.5" />
                Awka
              </span>

              {/* Phone */}
              {info?.phone && (
                <a 
                  href={`tel:${info.phone}`}
                  className="flex items-center gap-1 font-medium hover:text-yellow-300 transition-colors"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {info.phone}
                </a>
              )}
            </motion.div>
          </div>

          {/* Closed Message */}
          {!status?.is_open && status?.message && (
            <motion.div 
              variants={item}
              className="mt-3 p-2.5 bg-black/20 rounded-lg border border-white/10"
            >
              <p className="text-white text-sm">{status.message}</p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
