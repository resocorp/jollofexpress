'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Crosshair, Loader2, AlertCircle, Layers } from 'lucide-react';
import { toast } from 'sonner';

// Set Mapbox token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

interface LocationPickerProps {
  onLocationSelect: (location: { latitude: number; longitude: number; address?: string }) => void;
  initialLocation?: { latitude: number; longitude: number };
  className?: string;
}

// Default to Awka, Anambra State, Nigeria
const DEFAULT_CENTER: [number, number] = [7.0707, 6.2103];
const DEFAULT_ZOOM = 17;

// Map styles
const MAP_STYLES = {
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  streets: 'mapbox://styles/mapbox/streets-v12',
  navigation: 'mapbox://styles/mapbox/navigation-day-v1',
};

export function LocationPicker({ 
  onLocationSelect, 
  initialLocation,
  className = ''
}: LocationPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [mapStyle, setMapStyle] = useState<'satellite' | 'streets' | 'navigation'>('satellite');
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    address?: string;
  } | null>(initialLocation || null);
  const [mapError, setMapError] = useState<string | null>(null);

  // Reverse geocode to get address
  const reverseGeocode = useCallback(async (lng: number, lat: number): Promise<string | undefined> => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}`
      );
      const data = await response.json();
      return data.features?.[0]?.place_name;
    } catch {
      return undefined;
    }
  }, []);

  // Update marker and location
  const updateLocation = useCallback(async (lng: number, lat: number) => {
    const address = await reverseGeocode(lng, lat);
    const location = { latitude: lat, longitude: lng, address };
    setSelectedLocation(location);
    onLocationSelect(location);
    
    if (marker.current) {
      marker.current.setLngLat([lng, lat]);
    }
  }, [onLocationSelect, reverseGeocode]);

  // Get user's current location
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        if (map.current) {
          map.current.flyTo({ center: [longitude, latitude], zoom: 17 });
        }
        
        await updateLocation(longitude, latitude);
        setIsLocating(false);
        toast.success('Location found!');
      },
      (error) => {
        setIsLocating(false);
        toast.error('Unable to get your location. Please select manually.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [updateLocation]);

  // Toggle map style
  const toggleMapStyle = useCallback(() => {
    const styles: Array<'satellite' | 'streets' | 'navigation'> = ['satellite', 'streets', 'navigation'];
    const currentIndex = styles.indexOf(mapStyle);
    const nextStyle = styles[(currentIndex + 1) % styles.length];
    setMapStyle(nextStyle);
    
    if (map.current) {
      map.current.setStyle(MAP_STYLES[nextStyle]);
      // Re-add marker after style change
      map.current.once('style.load', () => {
        if (marker.current && selectedLocation) {
          marker.current.addTo(map.current!);
        }
      });
    }
    
    const styleNames = { satellite: 'Satellite', streets: 'Streets', navigation: 'Navigation' };
    toast.success(`Switched to ${styleNames[nextStyle]} view`);
  }, [mapStyle, selectedLocation]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    if (!mapboxgl.accessToken) {
      setMapError('Mapbox token not configured');
      setIsLoading(false);
      return;
    }

    try {
      const initialCenter = initialLocation 
        ? [initialLocation.longitude, initialLocation.latitude] as [number, number]
        : DEFAULT_CENTER;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: MAP_STYLES[mapStyle],
        center: initialCenter,
        zoom: DEFAULT_ZOOM,
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Create draggable marker
      marker.current = new mapboxgl.Marker({ 
        color: '#ea580c',
        draggable: true 
      })
        .setLngLat(initialCenter)
        .addTo(map.current);

      // Handle marker drag end
      marker.current.on('dragend', () => {
        const lngLat = marker.current?.getLngLat();
        if (lngLat) {
          updateLocation(lngLat.lng, lngLat.lat);
        }
      });

      // Handle map click to move marker
      map.current.on('click', (e) => {
        if (marker.current) {
          marker.current.setLngLat(e.lngLat);
          updateLocation(e.lngLat.lng, e.lngLat.lat);
        }
      });

      map.current.on('load', () => {
        setIsLoading(false);
      });

    } catch (err) {
      setMapError('Failed to initialize map');
      setIsLoading(false);
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [initialLocation, updateLocation]);

  if (mapError) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64 text-destructive">
          <AlertCircle className="h-5 w-5 mr-2" />
          {mapError}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Pin Your Delivery Location
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Tap on the map or drag the pin to your exact location
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <div 
            ref={mapContainer} 
            className="h-64 w-full rounded-lg overflow-hidden border"
          />
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={getCurrentLocation}
            disabled={isLocating}
            className="flex-1"
          >
            {isLocating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Crosshair className="h-4 w-4 mr-2" />
            )}
            Use My Location
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={toggleMapStyle}
            title="Change map style"
          >
            <Layers className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex justify-center">
          <span className="text-xs text-muted-foreground capitalize">
            {mapStyle} view
          </span>
        </div>

        {selectedLocation && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-medium text-green-900">Location Selected</p>
            {selectedLocation.address && (
              <p className="text-xs text-green-700 mt-1">{selectedLocation.address}</p>
            )}
            <p className="text-xs text-green-600 mt-1">
              {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
