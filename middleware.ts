import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { validateOrigin } from './lib/security/csrf';

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Configuration
const RATE_LIMIT_CONFIG = {
  maxRequests: 100, // Max requests per window
  windowMs: 60000, // 1 minute window
  maxPayloadSize: 1024 * 1024, // 1MB max payload
  suspiciousPayloadThreshold: 100 * 1024, // 100KB triggers logging
};

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, RATE_LIMIT_CONFIG.windowMs);

function getClientIdentifier(request: NextRequest): string {
  // Use multiple identifiers for better tracking
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';
  return ip;
}

function checkRateLimit(identifier: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetTime) {
    // Create new record
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT_CONFIG.windowMs,
    });
    return { allowed: true, remaining: RATE_LIMIT_CONFIG.maxRequests - 1 };
  }

  if (record.count >= RATE_LIMIT_CONFIG.maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: RATE_LIMIT_CONFIG.maxRequests - record.count };
}

function isRSCRequest(request: NextRequest): boolean {
  // Detect React Server Component requests
  const rscHeader = request.headers.get('rsc');
  const nextRouter = request.headers.get('next-router-state-tree');
  const contentType = request.headers.get('content-type');
  
  return !!(
    rscHeader || 
    nextRouter || 
    contentType?.includes('text/x-component')
  );
}

function validateRSCPayload(request: NextRequest): { valid: boolean; reason?: string } {
  const contentLength = request.headers.get('content-length');
  
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    
    if (size > RATE_LIMIT_CONFIG.maxPayloadSize) {
      return { 
        valid: false, 
        reason: `Payload too large: ${size} bytes (max: ${RATE_LIMIT_CONFIG.maxPayloadSize})` 
      };
    }
    
    if (size > RATE_LIMIT_CONFIG.suspiciousPayloadThreshold) {
      console.warn('[RSC Security] Large payload detected:', {
        size,
        ip: getClientIdentifier(request),
        path: request.nextUrl.pathname,
        timestamp: new Date().toISOString(),
      });
    }
  }
  
  return { valid: true };
}

export function middleware(request: NextRequest) {
  const identifier = getClientIdentifier(request);
  const isRSC = isRSCRequest(request);

  // Validate origin to prevent CSRF attacks
  if (!validateOrigin(request)) {
    return new NextResponse('Invalid origin', {
      status: 403,
    });
  }

  // Apply stricter rate limiting for RSC requests
  if (isRSC) {
    const { allowed, remaining } = checkRateLimit(`rsc:${identifier}`);
    
    if (!allowed) {
      console.error('[RSC Security] Rate limit exceeded:', {
        ip: identifier,
        path: request.nextUrl.pathname,
        timestamp: new Date().toISOString(),
      });
      
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Limit': RATE_LIMIT_CONFIG.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
        },
      });
    }
    
    // Validate payload
    const validation = validateRSCPayload(request);
    if (!validation.valid) {
      console.error('[RSC Security] Invalid payload:', {
        ip: identifier,
        path: request.nextUrl.pathname,
        reason: validation.reason,
        timestamp: new Date().toISOString(),
      });
      
      return new NextResponse('Payload validation failed', {
        status: 413,
      });
    }
    
    // Add security headers for RSC responses
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', RATE_LIMIT_CONFIG.maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    
    return response;
  }
  
  // Standard rate limiting for non-RSC requests
  const { allowed, remaining } = checkRateLimit(identifier);
  
  if (!allowed) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: {
        'Retry-After': '60',
      },
    });
  }
  
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Static files in public folder (sitemap.xml, robots.txt, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap\\.xml|robots\\.txt|.*\\.svg|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.ico|.*\\.webp|manifest\\.json|google.*\\.html).*)',
  ],
};
