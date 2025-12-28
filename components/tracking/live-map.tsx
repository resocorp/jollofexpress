'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bike, MapPin, Clock, Loader2 } from 'lucide-react';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

interface LiveMapProps {
  driverLocation?: { latitude: number; longitude: number };
  customerLocation: { latitude: number; longitude: number };
  restaurantLocation?: { latitude: number; longitude: number };
  estimatedMinutes?: number;
  onDriverLocationUpdate?: (location: { latitude: number; longitude: number }) => void;
  className?: string;
}

// Restaurant default location (Awka)
const RESTAURANT_LOCATION: [number, number] = [7.0707, 6.2103];

export function LiveMap({
  driverLocation,
  customerLocation,
  restaurantLocation,
  estimatedMinutes,
  onDriverLocationUpdate,
  className = ''
}: LiveMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const driverMarker = useRef<mapboxgl.Marker | null>(null);
  const customerMarker = useRef<mapboxgl.Marker | null>(null);
  const restaurantMarker = useRef<mapboxgl.Marker | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);

  // Update driver marker position
  const updateDriverPosition = useCallback((lat: number, lng: number) => {
    if (driverMarker.current) {
      driverMarker.current.setLngLat([lng, lat]);
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const restLoc = restaurantLocation 
      ? [restaurantLocation.longitude, restaurantLocation.latitude] as [number, number]
      : RESTAURANT_LOCATION;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [customerLocation.longitude, customerLocation.latitude],
      zoom: 15,
    });

    // Customer marker (destination - green)
    customerMarker.current = new mapboxgl.Marker({ color: '#22c55e' })
      .setLngLat([customerLocation.longitude, customerLocation.latitude])
      .setPopup(new mapboxgl.Popup().setHTML('<strong>Your Location</strong>'))
      .addTo(map.current);

    // Restaurant marker (orange)
    restaurantMarker.current = new mapboxgl.Marker({ color: '#f97316' })
      .setLngLat(restLoc)
      .setPopup(new mapboxgl.Popup().setHTML('<strong>JollofExpress</strong>'))
      .addTo(map.current);

    // Driver marker (if available - blue, animated)
    if (driverLocation) {
      driverMarker.current = new mapboxgl.Marker({ color: '#3b82f6' })
        .setLngLat([driverLocation.longitude, driverLocation.latitude])
        .setPopup(new mapboxgl.Popup().setHTML('<strong>Your Rider</strong>'))
        .addTo(map.current);
    }

    // Fit bounds to show all markers
    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([customerLocation.longitude, customerLocation.latitude]);
    bounds.extend(restLoc);
    if (driverLocation) {
      bounds.extend([driverLocation.longitude, driverLocation.latitude]);
    }
    map.current.fitBounds(bounds, { padding: 60 });

    map.current.on('load', () => setIsLoading(false));

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [customerLocation, restaurantLocation, driverLocation]);

  // Update driver position when it changes
  useEffect(() => {
    if (driverLocation && map.current) {
      if (!driverMarker.current) {
        driverMarker.current = new mapboxgl.Marker({ color: '#3b82f6' })
          .setLngLat([driverLocation.longitude, driverLocation.latitude])
          .addTo(map.current);
      } else {
        updateDriverPosition(driverLocation.latitude, driverLocation.longitude);
      }
    }
  }, [driverLocation, updateDriverPosition]);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bike className="h-5 w-5 text-primary" />
            Live Tracking
          </CardTitle>
          {estimatedMinutes && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              ~{estimatedMinutes} min
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div ref={mapContainer} className="h-64 w-full rounded-lg overflow-hidden border" />
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
        </div>
        
        {/* Legend */}
        <div className="flex gap-4 mt-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>You</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span>Rider</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span>Restaurant</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
