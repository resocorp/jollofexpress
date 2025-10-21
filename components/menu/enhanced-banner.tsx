'use client';

import { Clock, MapPin, Phone, Star, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRestaurantStatus, useRestaurantInfo } from '@/hooks/use-settings';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function EnhancedBanner() {
  const { data: status } = useRestaurantStatus();
  const { data: info } = useRestaurantInfo();

  const floatingAnimation = {
    y: [0, -20, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut"
    }
  };

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
    <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-red-500 to-pink-600">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg className="absolute top-0 left-0" width="100%" height="100%">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Floating Food Icons (Hidden on mobile) */}
      <div className="absolute inset-0 hidden lg:block overflow-hidden pointer-events-none">
        <motion.div
          animate={floatingAnimation}
          className="absolute top-20 left-10 text-6xl opacity-20"
          style={{ animationDelay: '0s' }}
        >
          🍖
        </motion.div>
        <motion.div
          animate={floatingAnimation}
          className="absolute top-40 right-20 text-5xl opacity-20"
          style={{ animationDelay: '1s' }}
        >
          🍚
        </motion.div>
        <motion.div
          animate={floatingAnimation}
          className="absolute bottom-20 left-1/4 text-7xl opacity-15"
          style={{ animationDelay: '0.5s' }}
        >
          🥘
        </motion.div>
        <motion.div
          animate={floatingAnimation}
          className="absolute top-1/2 right-10 text-4xl opacity-20"
          style={{ animationDelay: '1.5s' }}
        >
          🍗
        </motion.div>
      </div>

      {/* Main Content */}
      <motion.div 
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="relative container mx-auto px-4 py-16 md:py-20"
      >
        <div className="max-w-3xl">
          {/* Restaurant Name */}
          <motion.div variants={item} className="mb-4">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-2 tracking-tight">
              {info?.name || 'JollofExpress'}
            </h1>
            <div className="flex items-center gap-2 text-white/90">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="font-semibold">4.8</span>
              <span>(500+ reviews)</span>
            </div>
          </motion.div>

          {/* Description */}
          <motion.p variants={item} className="text-xl md:text-2xl mb-8 text-white/95 font-medium">
            {info?.description || 'Authentic Nigerian cuisine delivered fresh to your doorstep'}
          </motion.p>

          {/* Status Badges */}
          <motion.div variants={item} className="flex flex-wrap gap-3 mb-8">
            {/* Open/Closed Status */}
            <Badge 
              variant={status?.is_open ? 'default' : 'destructive'} 
              className={cn(
                "text-base px-5 py-2.5 font-semibold shadow-lg backdrop-blur-sm",
                status?.is_open 
                  ? "bg-green-500 hover:bg-green-600 text-white" 
                  : "bg-red-500 hover:bg-red-600"
              )}
            >
              <Clock className="h-5 w-5 mr-2" />
              {status?.is_open ? 'Open Now' : 'Closed'}
            </Badge>

            {/* Prep Time */}
            {status?.is_open && status.estimated_prep_time && (
              <Badge className="text-base px-5 py-2.5 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-white/30">
                <Clock className="h-5 w-5 mr-2" />
                {status.estimated_prep_time} min delivery
              </Badge>
            )}

            {/* Popular Badge */}
            <Badge className="text-base px-5 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg">
              <TrendingUp className="h-5 w-5 mr-2" />
              Popular
            </Badge>
          </motion.div>

          {/* Info Row */}
          <motion.div variants={item} className="flex flex-wrap gap-6 text-white/90">
            {/* Location */}
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              <span className="font-medium">Delivering in Awka</span>
            </div>

            {/* Phone */}
            {info?.phone && (
              <a 
                href={`tel:${info.phone}`}
                className="flex items-center gap-2 hover:text-white transition-colors"
              >
                <Phone className="h-5 w-5" />
                <span className="font-medium">{info.phone}</span>
              </a>
            )}
          </motion.div>

          {/* Closed Message */}
          {!status?.is_open && status?.message && (
            <motion.div 
              variants={item}
              className="mt-6 p-4 bg-white/10 rounded-xl backdrop-blur-md border border-white/20"
            >
              <p className="text-white font-medium">{status.message}</p>
            </motion.div>
          )}

          {/* CTA Buttons */}
          {status?.is_open && (
            <motion.div variants={item} className="mt-8 flex flex-wrap gap-4">
              <Button 
                size="lg" 
                className="bg-white text-primary hover:bg-white/90 font-bold text-lg px-8 shadow-2xl"
              >
                Order Now
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="border-2 border-white text-white hover:bg-white/10 font-semibold backdrop-blur-sm"
              >
                View Menu
              </Button>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Bottom Wave Effect */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-16 md:h-20">
          <path 
            d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" 
            className="fill-gray-50"
          ></path>
        </svg>
      </div>
    </div>
  );
}
