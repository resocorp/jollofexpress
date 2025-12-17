// CSRF Protection Middleware
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Generate a CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
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
 * Validate origin header to prevent CSRF attacks
 */
export function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');

  const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL;

  // For state-changing requests, verify origin
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    // Check origin header
    if (origin) {
      const originUrl = new URL(origin);
      const allowedUrl = allowedOrigin ? new URL(allowedOrigin) : null;

      if (allowedUrl && originUrl.host !== allowedUrl.host && originUrl.host !== host) {
        console.error('[CSRF] Origin mismatch:', {
          origin: originUrl.host,
          expected: allowedUrl?.host || host,
          path: request.nextUrl.pathname,
        });
        return false;
      }
    }

    // Fallback to referer check if no origin
    if (!origin && referer) {
      const refererUrl = new URL(referer);
      const allowedUrl = allowedOrigin ? new URL(allowedOrigin) : null;

      if (allowedUrl && refererUrl.host !== allowedUrl.host && refererUrl.host !== host) {
        console.error('[CSRF] Referer mismatch:', {
          referer: refererUrl.host,
          expected: allowedUrl?.host || host,
          path: request.nextUrl.pathname,
        });
        return false;
      }
    }
  }

  return true;
}
