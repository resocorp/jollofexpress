'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { MapPin, Check, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Dynamic import for map component (Leaflet requires client-side only)
const LocationMap = dynamic(
  () => import('./location-map').then((mod) => mod.LocationMap),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-[250px] rounded-lg bg-gray-100 animate-pulse flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    ),
  }
);

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface LocationShareButtonProps {
  onLocationCaptured: (location: LocationData | null) => void;
  className?: string;
}

export function LocationShareButton({ onLocationCaptured, className }: LocationShareButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [location, setLocation] = useState<LocationData | null>(null);

  const handleGetLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('error');
      setErrorMessage('Location not supported by your browser');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        console.log('[LOCATION] Captured:', locationData);
        setLocation(locationData);
        setStatus('success');
        onLocationCaptured(locationData);
      },
      (error) => {
        setStatus('error');
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setErrorMessage('Location access denied. Please enable location in your browser settings.');
            break;
          case error.POSITION_UNAVAILABLE:
            setErrorMessage('Location unavailable. Please try again.');
            break;
          case error.TIMEOUT:
            setErrorMessage('Location request timed out. Please try again.');
            break;
          default:
            setErrorMessage('Unable to get location. Please try again.');
        }
        onLocationCaptured(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [onLocationCaptured]);

  const handleClearLocation = useCallback(() => {
    setLocation(null);
    setStatus('idle');
    setErrorMessage('');
    onLocationCaptured(null);
  }, [onLocationCaptured]);

  const handleLocationChange = useCallback((lat: number, lng: number) => {
    const updatedLocation: LocationData = {
      latitude: lat,
      longitude: lng,
    };
    setLocation(updatedLocation);
    onLocationCaptured(updatedLocation);
  }, [onLocationCaptured]);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Location button or status */}
      <div className="flex items-center gap-2">
        {status === 'success' && location ? (
          <>
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-md flex-1">
              <Check className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700 font-medium">Location shared</span>
              <span className="text-xs text-green-600 ml-auto">
                {location.accuracy ? `±${Math.round(location.accuracy)}m` : ''}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearLocation}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={handleGetLocation}
            disabled={status === 'loading'}
            className={cn(
              'w-full justify-start gap-2 border-dashed',
              status === 'error' && 'border-red-300 text-red-600'
            )}
          >
            {status === 'loading' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Getting location...</span>
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4" />
                <span>Share my location</span>
              </>
            )}
          </Button>
        )}
      </div>

      {/* Error message */}
      {status === 'error' && errorMessage && (
        <p className="text-xs text-red-600">{errorMessage}</p>
      )}

      {/* Map display when location is captured */}
      {status === 'success' && location && (
        <LocationMap
          latitude={location.latitude}
          longitude={location.longitude}
          onLocationChange={handleLocationChange}
        />
      )}

      {/* Helper text */}
      {status !== 'success' && (
        <p className="text-xs text-muted-foreground">
          📍 Optional: Share your precise location to help us deliver faster
        </p>
      )}
    </div>
  );
}
