'use client';

import { Clock, MapPin, Phone } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRestaurantStatus, useRestaurantInfo } from '@/hooks/use-settings';

export function RestaurantBanner() {
  const { data: status } = useRestaurantStatus();
  const { data: info } = useRestaurantInfo();

  return (
    <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-2">
            {info?.name || 'JollofExpress'}
          </h1>
          <p className="text-lg md:text-xl mb-6 text-white/90">
            {info?.description || 'Delicious Nigerian cuisine delivered to your doorstep'}
          </p>
          
          <div className="flex flex-wrap gap-4 items-center">
            {/* Open/Closed Status */}
            <Badge variant={status?.is_open ? 'default' : 'destructive'} className="text-base px-4 py-2">
              <Clock className="h-4 w-4 mr-2" />
              {status?.is_open ? 'Open Now' : 'Closed'}
            </Badge>

            {/* Prep Time */}
            {status?.is_open && (
              <div className="flex items-center gap-2 text-white/90">
                <Clock className="h-5 w-5" />
                <span>{status.estimated_prep_time} min prep time</span>
              </div>
            )}

            {/* Location */}
            <div className="flex items-center gap-2 text-white/90">
              <MapPin className="h-5 w-5" />
              <span>Delivering in Awka</span>
            </div>

            {/* Phone */}
            {info?.phone && (
              <div className="flex items-center gap-2 text-white/90">
                <Phone className="h-5 w-5" />
                <span>{info.phone}</span>
              </div>
            )}
          </div>

          {/* Closed Message */}
          {!status?.is_open && status?.message && (
            <div className="mt-4 p-4 bg-white/10 rounded-lg backdrop-blur">
              <p className="text-white">{status.message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
