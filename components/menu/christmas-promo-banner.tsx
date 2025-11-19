'use client';

import { Gift, Sparkles, MapPin, Clock, Phone, Star, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useRestaurantStatus, useRestaurantInfo } from '@/hooks/use-settings';

export function ChristmasPromoBanner() {
  const { data: status } = useRestaurantStatus();
  const { data: info } = useRestaurantInfo();
  const [selectedLocation, setSelectedLocation] = useState('Awka');
  const [showLocationMenu, setShowLocationMenu] = useState(false);

  const locations = ['Awka', 'Enugu', 'Onitsha', 'Aba'];

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
                  🎄 CHRISTMAS SPECIAL OFFER! 🎁
                </h2>
              </motion.div>
              
              <p className="text-sm sm:text-base md:text-lg font-semibold text-white/95 drop-shadow">
                Enjoy <span className="text-[#FFD700] font-black text-base sm:text-lg md:text-xl">FREE DELIVERY</span> on orders above ₦5,000!
              </p>
              
              <p className="text-xs sm:text-sm text-white/90 font-medium">
                🎅 Valid throughout December • Spread the Joy of Good Food! 🎉
              </p>
            </div>

            {/* Right: CTA Button */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                size="lg"
                className="hidden sm:flex bg-white hover:bg-yellow-50 text-[#D32F2F] font-bold shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-[#FFD700] min-h-[44px] touch-manipulation"
              >
                <Gift className="h-5 w-5 mr-2" />
                Order Now!
              </Button>

              {/* Mobile CTA */}
              <Button
                size="sm"
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
              className="w-full bg-white hover:bg-yellow-50 text-[#D32F2F] font-bold shadow-lg border-2 border-[#FFD700] min-h-[44px] touch-manipulation"
            >
              <Gift className="h-4 w-4 mr-2" />
              Order Now & Get FREE Delivery!
            </Button>
          </motion.div>

          {/* Restaurant Info Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-4 pt-4 border-t border-white/20"
          >
            {/* Location Selector */}
            <div className="mb-3">
              <div className="relative inline-block">
                <button
                  onClick={() => setShowLocationMenu(!showLocationMenu)}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 transition-all touch-manipulation"
                >
                  <MapPin className="h-4 w-4 text-white" />
                  <span className="text-white font-medium text-sm">{selectedLocation}</span>
                  <ChevronDown className={`h-4 w-4 text-white transition-transform ${showLocationMenu ? 'rotate-180' : ''}`} />
                </button>

                {showLocationMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-full mt-2 left-0 bg-white rounded-lg shadow-lg overflow-hidden z-10 min-w-[150px]"
                  >
                    {locations.map((location) => (
                      <button
                        key={location}
                        onClick={() => {
                          setSelectedLocation(location);
                          setShowLocationMenu(false);
                        }}
                        className={`block w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors ${
                          selectedLocation === location ? 'bg-gray-50 font-semibold text-[#FF4433]' : 'text-gray-700'
                        }`}
                      >
                        {location}
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>
            </div>

            {/* Restaurant Info Row */}
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <p className="text-white font-semibold text-base sm:text-lg">
                {info?.description || 'Delicious Nigerian cuisine delivered to your doorstep'}
              </p>
              
              {/* Star Rating */}
              <div className="flex items-center gap-2 text-white">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <span className="font-semibold">4.8</span>
                <span className="text-white/90">(500+)</span>
              </div>
            </div>

            {/* Status & Details */}
            <div className="flex flex-wrap items-center gap-4 text-white text-sm">
              {/* Status Badge */}
              {status?.is_open ? (
                <span className="flex items-center gap-1.5 font-normal">
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  Open
                </span>
              ) : (
                <span className="flex items-center gap-1.5 font-normal">
                  <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                  Closed
                </span>
              )}
              
              <span className="text-white/40">•</span>

              {/* Prep Time */}
              {status?.is_open && status.estimated_prep_time && (
                <>
                  <span className="font-normal">{status.estimated_prep_time} min</span>
                  <span className="text-white/40">•</span>
                </>
              )}

              {/* Location */}
              <span className="font-normal">{selectedLocation}</span>
              
              <span className="text-white/40">•</span>

              {/* Phone */}
              {info?.phone && (
                <>
                  <a 
                    href={`tel:${info.phone}`}
                    className="flex items-center gap-1.5 font-normal hover:text-yellow-300 transition-colors touch-manipulation"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{info.phone}</span>
                    <span className="sm:hidden">Call</span>
                  </a>
                  
                  {status?.is_open && status?.next_status_change?.action === 'close' && (
                    <span className="text-white/40">•</span>
                  )}
                </>
              )}

              {/* Last Orders Time */}
              {status?.is_open && status?.next_status_change?.action === 'close' && (
                <span className="flex items-center gap-1.5 font-normal">
                  <Clock className="h-3.5 w-3.5" />
                  Last orders at {status.next_status_change.time}
                </span>
              )}
            </div>

            {/* Closed Status Message */}
            {!status?.is_open && (
              <div className="mt-3 p-3 bg-white/10 rounded-lg border border-white/20">
                <p className="text-white text-sm font-medium mb-2">{status?.message}</p>
                {status?.closed_reason && (
                  <p className="text-white/80 text-xs italic mb-2">
                    {status.closed_reason}
                  </p>
                )}
                {status?.hours?.today && (
                  <p className="text-white/90 text-xs">
                    <span className="font-semibold">Today's Hours:</span> {status.hours.today}
                  </p>
                )}
                {status?.next_status_change?.action === 'open' && (
                  <p className="text-green-300 text-xs font-medium mt-2">
                    Opens at {status.next_status_change.time}
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
  );
}
