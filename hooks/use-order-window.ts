// React Query hook for batch delivery order window status
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import { get } from '@/lib/api-client';

interface BatchStatusInfo {
  id: string;
  deliveryWindowId: string | null;
  windowName: string;
  deliveryDate: string;
  deliveryWindow: string;
  status: string;
  ordersPlaced: number;
  maxCapacity: number;
  capacityPercent: number;
  cutoffTime: string;
  deliveryStart: string;
  deliveryEnd: string;
  secondsUntilCutoff: number;
}

interface OrderWindowStatusResponse {
  nextBatch: BatchStatusInfo | null;
  allTodayBatches: BatchStatusInfo[];
  isAccepting: boolean;
  isPreorder: boolean;
  deliveryDate: string;
  deliveryDateRaw: string;
  deliveryWindow: string;
  secondsUntilCutoff: number;
  capacityPercent: number;
  message: string;
  is_open: boolean;
}

/**
 * Hook to fetch and auto-refresh order window status
 * Used by menu, cart, and checkout components
 */
export function useOrderWindow() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['order-window-status'],
    queryFn: () => get<OrderWindowStatusResponse>('/api/order-window/status'),
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider stale after 10 seconds
  });

  // Client-side countdown that ticks every second
  const [localCountdown, setLocalCountdown] = useState<number>(0);

  // Sync countdown from server data
  useEffect(() => {
    if (data?.secondsUntilCutoff !== undefined) {
      setLocalCountdown(data.secondsUntilCutoff);
    }
  }, [data?.secondsUntilCutoff]);

  // Tick countdown every second
  useEffect(() => {
    if (localCountdown <= 0) return;

    const timer = setInterval(() => {
      setLocalCountdown(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [localCountdown]);

  const formatCountdown = useCallback((totalSeconds: number): string => {
    if (totalSeconds <= 0) return '00:00:00';
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, []);

  return {
    // Batch data
    nextBatch: data?.nextBatch || null,
    allTodayBatches: data?.allTodayBatches || [],

    // Customer-facing summary
    isAccepting: data?.isAccepting ?? false,
    isPreorder: data?.isPreorder ?? false,
    deliveryDate: data?.deliveryDate || '',
    deliveryDateRaw: data?.deliveryDateRaw || '',
    deliveryWindow: data?.deliveryWindow || '',
    capacityPercent: data?.capacityPercent || 0,
    message: data?.message || '',

    // Countdown
    secondsUntilCutoff: localCountdown,
    countdownFormatted: formatCountdown(localCountdown),

    // Backward compat
    isOpen: data?.is_open ?? false,

    // Query state
    isLoading,
    error,
  };
}

/**
 * Hook to fetch feature flags (public, cached aggressively)
 */
export function useFeatureFlag(flagKey: string): boolean {
  const { data } = useQuery({
    queryKey: ['feature-flags-public'],
    queryFn: async () => {
      const response = await fetch('/api/order-window/status');
      // Feature flags are not in this endpoint yet — we'll add a separate lightweight endpoint
      // For now, return empty. Feature flags will be fetched via the settings or a dedicated endpoint.
      return {};
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: false, // Disabled until we have the endpoint
  });

  return false; // Default off until implemented
}
