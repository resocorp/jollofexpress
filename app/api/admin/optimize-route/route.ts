import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';
import { optimizeRoute, type RouteStop } from '@/lib/delivery/route-optimizer';

export const dynamic = 'force-dynamic';

// POST /api/admin/optimize-route
// Body: { stops: { id, lat, lng }[], origin?: { lat, lng } }
// Returns the shared OptimizedRouteResult so admin clients can render the
// road-following polyline + per-leg metrics.
export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const stops = (body.stops || []) as RouteStop[];
    const origin = body.origin as { lat: number; lng: number } | undefined;

    const result = await optimizeRoute(stops, origin);
    return NextResponse.json(result);
  } catch (err) {
    console.error('optimize-route error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Optimize failed' },
      { status: 500 }
    );
  }
}
