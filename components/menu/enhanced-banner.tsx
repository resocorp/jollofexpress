'use client';

import { Clock, MapPin, Phone, Star, ChevronDown } from 'lucide-react';
import { useRestaurantStatus, useRestaurantInfo } from '@/hooks/use-settings';
import { motion } from 'framer-motion';
import { useState } from 'react';

export function EnhancedBanner() {
  const { data: status } = useRestaurantStatus();
  const { data: info } = useRestaurantInfo();
  const [selectedLocation, setSelectedLocation] = useState('Awka');
  const [showLocationMenu, setShowLocationMenu] = useState(false);

  const locations = ['Awka', 'Enugu', 'Onitsha', 'Aba'];

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
    <div className="relative overflow-hidden bg-[#FF4433]">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#FF4433] to-[#E63320] opacity-90" />

      {/* Main Content */}
      <motion.div 
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="relative container mx-auto px-5 sm:px-6 lg:px-8 py-5 max-w-[1400px]"
      >
        {/* Location Selector */}
        <motion.div 
          variants={item}
          className="mb-3"
        >
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
        </motion.div>

        {/* Section 1 - Main Tagline with Rating */}
        <motion.div 
          variants={item} 
          className="flex flex-wrap items-center gap-3 mb-3"
        >
          <p className="text-white font-semibold text-lg sm:text-xl">
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
        </motion.div>

        {/* Section 2 - Store Information */}
        <motion.div 
          variants={item} 
          className="flex flex-wrap items-center gap-4 text-white text-sm"
        >
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
          <span className="font-normal">Awka</span>
          
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
        </motion.div>

        {/* Closed Status Message (only when closed) */}
        {!status?.is_open && (
          <motion.div 
            variants={item}
            className="mt-4 p-3 sm:p-4 bg-white/10 rounded-lg border border-white/20"
          >
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
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
