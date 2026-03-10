// CSRF Protection Middleware
import { NextRequest, NextResponse } from 'next/server';

/**
 * Generate a CSRF token using Web Crypto API (Edge-compatible)
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify CSRF token for state-changing operations (POST, PUT, PATCH, DELETE)
 * This should be used in API routes that modify data
 */
export function verifyCSRFToken(request: NextRequest): boolean {
  const method = request.method;

  // Only verify for state-changing methods
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return true;
  }

  // Get token from header or body
  const headerToken = request.headers.get('x-csrf-token');
  const cookieToken = request.cookies.get('csrf-token')?.value;

  // For now, we'll use a more lenient approach since implementing full CSRF
  // requires frontend changes. Check if tokens exist and match if both are present.
  if (headerToken && cookieToken) {
    return headerToken === cookieToken;
  }

  // If CSRF is not yet implemented in frontend, allow through but log warning
  console.warn('[CSRF] CSRF protection not fully implemented. Request allowed:', {
    method,
    path: request.nextUrl.pathname,
    hasHeaderToken: !!headerToken,
    hasCookieToken: !!cookieToken,
  });

  return true; // Allow for backward compatibility during migration
}

/**
 * Middleware to add CSRF token to response
 */
export function addCSRFTokenToResponse(response: NextResponse): NextResponse {
  const token = generateCSRFToken();

  response.cookies.set('csrf-token', token, {
    httpOnly: false, // Must be readable by client JS
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });

  response.headers.set('X-CSRF-Token', token);

  return response;
}

/**
 * Check if a URL's host is allowed based on the request host and configured app URL
 */
function isAllowedHost(
  urlString: string,
  requestHost: string | null,
  allowedAppUrl: string | undefined,
  isLocalhost: boolean
): boolean {
  const parsed = new URL(urlString);
  const allowedUrl = allowedAppUrl ? new URL(allowedAppUrl) : null;

  if (parsed.host === requestHost) return true;
  if (allowedUrl && parsed.host === allowedUrl.host) return true;
  if (isLocalhost && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) return true;

  return false;
}

/**
 * Validate origin header to prevent CSRF attacks
 */
export function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');

  const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL;
  
  // Allow localhost/127.0.0.1 for development
  const isLocalhost = host?.includes('localhost') || host?.includes('127.0.0.1') || false;

  // For state-changing requests, verify origin
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    // Check origin header
    if (origin) {
      if (isAllowedHost(origin, host, allowedOrigin, isLocalhost)) {
        return true;
      }
      console.error('[CSRF] Origin mismatch:', {
        origin: new URL(origin).host,
        host,
        expected: allowedOrigin ? new URL(allowedOrigin).host : undefined,
        path: request.nextUrl.pathname,
      });
      return false;
    }

    // Fallback to referer check if no origin
    if (!origin && referer) {
      if (isAllowedHost(referer, host, allowedOrigin, isLocalhost)) {
        return true;
      }
      console.error('[CSRF] Referer mismatch:', {
        referer: new URL(referer).host,
        host,
        expected: allowedOrigin ? new URL(allowedOrigin).host : undefined,
        path: request.nextUrl.pathname,
      });
      return false;
    }
  }

  return true;
}
