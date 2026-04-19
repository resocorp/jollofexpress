'use client';

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { MapPin, Check, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  required?: boolean;
  highlight?: boolean;
}

// Restaurant coords — sensible default when GPS is denied / desktop users
const DEFAULT_LAT = 7.0707;
const DEFAULT_LNG = 6.2103;

const LOCATION_ANIMATION_KEY = 'jollof_location_animation_count';
const MAX_ANIMATION_VIEWS = 5;

export function LocationShareButton({
  onLocationCaptured,
  className,
  required = false,
  highlight = false,
}: LocationShareButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [location, setLocation] = useState<LocationData | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const count = parseInt(localStorage.getItem(LOCATION_ANIMATION_KEY) || '0', 10);
      setShowAnimation(count < MAX_ANIMATION_VIEWS);
      if (count < MAX_ANIMATION_VIEWS) {
        localStorage.setItem(LOCATION_ANIMATION_KEY, String(count + 1));
      }
    } catch {
      setShowAnimation(true);
    }
  }, []);

  const handleGetLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('error');
      setErrorMessage('Location not supported by your browser. Drop a pin on the map instead.');
      setShowMapPicker(true);
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
        setLocation(locationData);
        setStatus('success');
        onLocationCaptured(locationData);
      },
      (error) => {
        setStatus('error');
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setErrorMessage('Location permission denied. Drop a pin on the map instead.');
            break;
          case error.POSITION_UNAVAILABLE:
            setErrorMessage('Location unavailable. Drop a pin on the map instead.');
            break;
          case error.TIMEOUT:
            setErrorMessage('Location request timed out. Drop a pin on the map instead.');
            break;
          default:
            setErrorMessage('Unable to get location. Drop a pin on the map instead.');
        }
        setShowMapPicker(true);
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
    setShowMapPicker(false);
    onLocationCaptured(null);
  }, [onLocationCaptured]);

  const handleLocationChange = useCallback(
    (lat: number, lng: number) => {
      const updatedLocation: LocationData = { latitude: lat, longitude: lng };
      setLocation(updatedLocation);
      setStatus('success');
      onLocationCaptured(updatedLocation);
    },
    [onLocationCaptured]
  );

  const handleShowMapPicker = useCallback(() => {
    setShowMapPicker(true);
    setErrorMessage('');
  }, []);

  const hasLocation = status === 'success' && location;
  const mapVisible = hasLocation || showMapPicker;
  const mapLat = location?.latitude ?? DEFAULT_LAT;
  const mapLng = location?.longitude ?? DEFAULT_LNG;
  const missing = required && !hasLocation;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2">
        {hasLocation ? (
          <>
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-md flex-1">
              <Check className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700 font-medium">Location set</span>
              <span className="text-xs text-green-600 ml-auto">
                {location?.accuracy ? `±${Math.round(location.accuracy)}m` : 'pinned'}
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
          <div className="w-full space-y-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleGetLocation}
              disabled={status === 'loading'}
              className={cn(
                'w-full justify-start gap-2',
                missing && highlight && 'border-red-500 text-red-700 ring-2 ring-red-200',
                missing && !highlight && 'border-red-300',
                showAnimation && status === 'idle' && 'location-btn-animated'
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
            {!showMapPicker && status !== 'loading' && (
              <button
                type="button"
                onClick={handleShowMapPicker}
                className="text-xs text-primary underline hover:no-underline"
              >
                or drop a pin on the map
              </button>
            )}
          </div>
        )}
      </div>

      {status === 'error' && errorMessage && (
        <p className="text-xs text-red-600">{errorMessage}</p>
      )}

      {mapVisible && (
        <LocationMap
          latitude={mapLat}
          longitude={mapLng}
          onLocationChange={handleLocationChange}
        />
      )}

      {!hasLocation && (
        <p className={cn('text-xs', missing ? 'text-red-600' : 'text-muted-foreground')}>
          📍 {required ? 'Required: ' : ''}Share your GPS location or tap the map to drop a pin.
        </p>
      )}
    </div>
  );
}
