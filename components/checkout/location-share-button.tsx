'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Check, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface LocationShareButtonProps {
  onLocationCaptured: (location: LocationData | null) => void;
  className?: string;
}

const LOCATION_ANIMATION_KEY = 'jollof_location_animation_count';
const MAX_ANIMATION_VIEWS = 5;

export function LocationShareButton({
  onLocationCaptured,
  className,
}: LocationShareButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [location, setLocation] = useState<LocationData | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);

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
      setErrorMessage("Your browser doesn't support location sharing. You can continue without it.");
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
            setErrorMessage('Location permission denied. You can continue without it.');
            break;
          case error.POSITION_UNAVAILABLE:
            setErrorMessage('Location unavailable. You can continue without it.');
            break;
          case error.TIMEOUT:
            setErrorMessage('Location request timed out. You can continue without it.');
            break;
          default:
            setErrorMessage("Couldn't get your location. You can continue without it.");
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

  const hasLocation = status === 'success' && location;

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
          <Button
            type="button"
            variant="outline"
            onClick={handleGetLocation}
            disabled={status === 'loading'}
            className={cn(
              'w-full justify-start gap-2',
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
        )}
      </div>

      {status === 'error' && errorMessage && (
        <p className="text-xs text-red-600">{errorMessage}</p>
      )}

      {!hasLocation && (
        <p className="text-xs text-muted-foreground">
          📍 Optional — sharing your GPS helps the rider find you faster.
        </p>
      )}
    </div>
  );
}
