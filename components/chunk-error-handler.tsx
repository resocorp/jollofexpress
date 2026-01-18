'use client';

import { useEffect } from 'react';

/**
 * Global handler for chunk loading errors
 * These errors commonly occur after deployments when cached pages try to load new chunks
 */
export function ChunkErrorHandler() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const error = event.error;
      
      // Check if it's a chunk loading error
      if (
        error?.name === 'ChunkLoadError' ||
        error?.message?.includes('ChunkLoadError') ||
        error?.message?.includes('Loading chunk') ||
        error?.message?.includes('Failed to fetch dynamically imported module')
      ) {
        console.warn('[ChunkErrorHandler] Detected chunk loading error, reloading page...');
        
        // Prevent the error from showing in console
        event.preventDefault();
        
        // Store a flag to prevent infinite reload loops
        const reloadKey = 'chunk_error_reload';
        const lastReload = sessionStorage.getItem(reloadKey);
        const now = Date.now();
        
        // Only auto-reload if we haven't reloaded in the last 10 seconds
        if (!lastReload || (now - parseInt(lastReload)) > 10000) {
          sessionStorage.setItem(reloadKey, now.toString());
          window.location.reload();
        }
      }
    };

    // Handle unhandled promise rejections (for dynamic imports)
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      
      if (
        reason?.name === 'ChunkLoadError' ||
        reason?.message?.includes('ChunkLoadError') ||
        reason?.message?.includes('Loading chunk') ||
        reason?.message?.includes('Failed to fetch dynamically imported module')
      ) {
        console.warn('[ChunkErrorHandler] Detected chunk loading rejection, reloading page...');
        
        event.preventDefault();
        
        const reloadKey = 'chunk_error_reload';
        const lastReload = sessionStorage.getItem(reloadKey);
        const now = Date.now();
        
        if (!lastReload || (now - parseInt(lastReload)) > 10000) {
          sessionStorage.setItem(reloadKey, now.toString());
          window.location.reload();
        }
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return null;
}
