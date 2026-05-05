// Shared route optimizer used by the batch map and the dispatch board.
//
// Primary path: Mapbox Optimization API — solves TSP on the road network and
// returns the optimized stop order plus a road-following GeoJSON polyline.
// Fallback: nearest-neighbor on great-circle distance — kicks in when the API
// is unreachable, returns non-2xx, the stop count exceeds Mapbox's 12-stop
// ceiling, or MAPBOX_OPTIMIZATION_DISABLED is set.
//
// Results are cached in-process keyed by the sorted stop-ID set + origin, so
// repeated polling at 4s does not hammer Mapbox.

import { RESTAURANT_LOCATION } from './restaurant-location';

export interface RouteStop {
  id: string;
  lat: number;
  lng: number;
}

export interface RouteLeg {
  fromId: string; // 'origin' for the first leg from the restaurant
  toId: string;
  distanceM: number;
  durationS: number;
}

export interface OptimizedRouteResult {
  orderedIds: string[];
  totalDistanceM: number;
  totalDurationS: number;
  geometry: GeoJSON.LineString;
  legs: RouteLeg[];
  // 'mapbox' = TSP-optimized order + road geometry from Optimization API
  // 'fallback-roads' = nearest-neighbor order + road geometry from Directions API
  // 'fallback' = nearest-neighbor order + straight-line geometry (no token / API down)
  source: 'mapbox' | 'fallback-roads' | 'fallback';
}

const MAPBOX_MAX_STOPS = 12; // Optimization API limit (excluding source/destination)
const DIRECTIONS_MAX_WAYPOINTS = 25; // Directions API limit (origin + stops)
const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  result: OptimizedRouteResult;
  expiresAt: number;
}

const routeCache = new Map<string, CacheEntry>();

function buildCacheKey(stops: RouteStop[], origin: { lat: number; lng: number }): string {
  // Order-independent: sort by ID so reordering stops doesn't bust the cache,
  // but adding/removing a stop or moving the origin does.
  const ids = [...stops.map(s => `${s.id}:${s.lat.toFixed(6)},${s.lng.toFixed(6)}`)].sort();
  return `${origin.lat.toFixed(6)},${origin.lng.toFixed(6)}|${ids.join('|')}`;
}

export function invalidateRouteCache(): void {
  routeCache.clear();
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fallbackRoute(
  stops: RouteStop[],
  origin: { lat: number; lng: number }
): OptimizedRouteResult {
  if (stops.length === 0) {
    return {
      orderedIds: [],
      totalDistanceM: 0,
      totalDurationS: 0,
      geometry: { type: 'LineString', coordinates: [[origin.lng, origin.lat]] },
      legs: [],
      source: 'fallback',
    };
  }

  const remaining = new Set(stops.map(s => s.id));
  const stopMap = new Map(stops.map(s => [s.id, s]));
  const ordered: string[] = [];
  const legs: RouteLeg[] = [];
  const coords: [number, number][] = [[origin.lng, origin.lat]];

  let curLat = origin.lat;
  let curLng = origin.lng;
  let curId: string = 'origin';
  let totalDist = 0;

  while (remaining.size > 0) {
    let bestId = '';
    let bestDist = Infinity;
    for (const id of remaining) {
      const s = stopMap.get(id)!;
      const d = haversineMeters(curLat, curLng, s.lat, s.lng);
      if (d < bestDist) {
        bestDist = d;
        bestId = id;
      }
    }
    const next = stopMap.get(bestId)!;
    ordered.push(bestId);
    legs.push({
      fromId: curId,
      toId: bestId,
      distanceM: bestDist,
      // Rough proxy when we have no road data: assume 30 km/h average.
      durationS: bestDist / (30_000 / 3600),
    });
    coords.push([next.lng, next.lat]);
    totalDist += bestDist;
    curLat = next.lat;
    curLng = next.lng;
    curId = bestId;
    remaining.delete(bestId);
  }

  return {
    orderedIds: ordered,
    totalDistanceM: totalDist,
    totalDurationS: legs.reduce((s, l) => s + l.durationS, 0),
    geometry: { type: 'LineString', coordinates: coords },
    legs,
    source: 'fallback',
  };
}

interface MapboxOptimizationResponse {
  code: string;
  trips?: Array<{
    geometry: GeoJSON.LineString;
    legs: Array<{ distance: number; duration: number }>;
    distance: number;
    duration: number;
  }>;
  waypoints?: Array<{
    waypoint_index: number;
    trips_index: number;
    location: [number, number];
  }>;
  message?: string;
}

async function mapboxRoute(
  stops: RouteStop[],
  origin: { lat: number; lng: number },
  token: string
): Promise<OptimizedRouteResult | null> {
  // Coords are origin first, then stops, in [lng,lat] order joined by ';'.
  const coordParts = [
    `${origin.lng.toFixed(6)},${origin.lat.toFixed(6)}`,
    ...stops.map(s => `${s.lng.toFixed(6)},${s.lat.toFixed(6)}`),
  ];

  const params = new URLSearchParams({
    geometries: 'geojson',
    overview: 'full',
    source: 'first',
    destination: 'last',
    roundtrip: 'false',
    annotations: 'distance,duration',
    access_token: token,
  });

  const url = `https://api.mapbox.com/optimized-trips/v1/mapbox/driving/${coordParts.join(';')}?${params}`;

  const resp = await fetch(url, { method: 'GET' });
  if (!resp.ok) {
    console.error('[route-optimizer] Mapbox HTTP', resp.status, await resp.text());
    return null;
  }
  const data = (await resp.json()) as MapboxOptimizationResponse;
  if (data.code !== 'Ok' || !data.trips?.[0] || !data.waypoints) {
    console.error('[route-optimizer] Mapbox non-Ok:', data.code, data.message);
    return null;
  }

  const trip = data.trips[0];
  // waypoints[0] is origin; the rest map back to our `stops` array by input index.
  // waypoint_index gives the position along the optimized trip.
  const stopWaypoints = data.waypoints
    .map((wp, inputIdx) => ({ wp, inputIdx }))
    .filter(({ inputIdx }) => inputIdx > 0)
    .sort((a, b) => a.wp.waypoint_index - b.wp.waypoint_index);

  const orderedIds = stopWaypoints.map(({ inputIdx }) => stops[inputIdx - 1].id);

  // trip.legs has length = waypoints - 1, each leg between consecutive
  // optimized waypoints. The first leg is origin -> first stop.
  const legs: RouteLeg[] = trip.legs.map((leg, i) => ({
    fromId: i === 0 ? 'origin' : orderedIds[i - 1],
    toId: orderedIds[i],
    distanceM: leg.distance,
    durationS: leg.duration,
  }));

  return {
    orderedIds,
    totalDistanceM: trip.distance,
    totalDurationS: trip.duration,
    geometry: trip.geometry,
    legs,
    source: 'mapbox',
  };
}

interface MapboxDirectionsResponse {
  code: string;
  routes?: Array<{
    geometry: GeoJSON.LineString;
    distance: number;
    duration: number;
    legs: Array<{ distance: number; duration: number }>;
  }>;
  message?: string;
}

/**
 * Fetch road-following geometry through a pre-ordered list of waypoints.
 * Used to upgrade nearest-neighbor results from straight lines to actual
 * driving geometry — the order isn't TSP-optimal, but the visual is correct
 * and distance/duration become realistic instead of haversine-with-30km/h.
 *
 * Returns null if the call can't be made (no token, too many waypoints, API
 * error). Caller should keep the original straight-line result in that case.
 */
async function mapboxDirections(
  orderedStops: RouteStop[],
  origin: { lat: number; lng: number },
  token: string
): Promise<{
  geometry: GeoJSON.LineString;
  distanceM: number;
  durationS: number;
  legs: Array<{ distanceM: number; durationS: number }>;
} | null> {
  if (orderedStops.length === 0) return null;
  if (orderedStops.length + 1 > DIRECTIONS_MAX_WAYPOINTS) {
    // TODO: chunk into segments of 24 stops + concat. For now we'll keep
    // straight lines if a single batch ever has >24 stops.
    return null;
  }

  const coordParts = [
    `${origin.lng.toFixed(6)},${origin.lat.toFixed(6)}`,
    ...orderedStops.map(s => `${s.lng.toFixed(6)},${s.lat.toFixed(6)}`),
  ];
  const params = new URLSearchParams({
    geometries: 'geojson',
    overview: 'full',
    access_token: token,
  });
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordParts.join(';')}?${params}`;

  try {
    const resp = await fetch(url, { method: 'GET' });
    if (!resp.ok) {
      console.error('[route-optimizer] Directions HTTP', resp.status, await resp.text());
      return null;
    }
    const data = (await resp.json()) as MapboxDirectionsResponse;
    if (data.code !== 'Ok' || !data.routes?.[0]) {
      console.error('[route-optimizer] Directions non-Ok:', data.code, data.message);
      return null;
    }
    const r = data.routes[0];
    return {
      geometry: r.geometry,
      distanceM: r.distance,
      durationS: r.duration,
      legs: r.legs.map(l => ({ distanceM: l.distance, durationS: l.duration })),
    };
  } catch (err) {
    console.error('[route-optimizer] Directions threw:', err);
    return null;
  }
}

/**
 * Optimize a delivery route. Origin defaults to the restaurant.
 *
 * Decision tree:
 *   - 0 or 1 stop: cheap synthetic result (no API call needed)
 *   - ≤12 stops + token: Mapbox Optimization API (TSP-optimal order + road geometry)
 *   - >12 stops + token: nearest-neighbor for ORDER, then Mapbox Directions
 *     API for road-following GEOMETRY (still ≤24 stops, source 'fallback-roads')
 *   - No token / API down / >24 stops: nearest-neighbor with straight lines
 */
export async function optimizeRoute(
  stops: RouteStop[],
  origin: { lat: number; lng: number } = RESTAURANT_LOCATION
): Promise<OptimizedRouteResult> {
  if (stops.length === 0) return fallbackRoute(stops, origin);
  if (stops.length === 1) {
    const only = stops[0];
    const dist = haversineMeters(origin.lat, origin.lng, only.lat, only.lng);
    return {
      orderedIds: [only.id],
      totalDistanceM: dist,
      totalDurationS: dist / (30_000 / 3600),
      geometry: {
        type: 'LineString',
        coordinates: [[origin.lng, origin.lat], [only.lng, only.lat]],
      },
      legs: [{ fromId: 'origin', toId: only.id, distanceM: dist, durationS: dist / (30_000 / 3600) }],
      source: 'fallback',
    };
  }

  const cacheKey = buildCacheKey(stops, origin);
  const cached = routeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  const disabled = process.env.MAPBOX_OPTIMIZATION_DISABLED === 'true';
  // Server-only token preferred; fall back to the public token (still valid
  // for Optimization, just easier to leak — restrict scope on Mapbox side).
  const token =
    process.env.MAPBOX_OPTIMIZATION_TOKEN ||
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
    '';

  let result: OptimizedRouteResult | null = null;
  if (!disabled && token && stops.length <= MAPBOX_MAX_STOPS) {
    try {
      result = await mapboxRoute(stops, origin, token);
    } catch (err) {
      console.error('[route-optimizer] Mapbox call threw:', err);
    }
  }

  if (!result) result = fallbackRoute(stops, origin);

  // If we landed on the straight-line fallback (>12 stops or Mapbox failed),
  // try to upgrade just the geometry via Directions API. The order stays the
  // greedy nearest-neighbor sequence, but the line follows actual roads and
  // the distance/duration reflect real driving.
  if (result.source === 'fallback' && !disabled && token) {
    const stopMap = new Map(stops.map(s => [s.id, s]));
    const orderedStops = result.orderedIds
      .map(id => stopMap.get(id))
      .filter((s): s is RouteStop => !!s);

    const directions = await mapboxDirections(orderedStops, origin, token);
    if (directions) {
      result = {
        ...result,
        geometry: directions.geometry,
        totalDistanceM: directions.distanceM,
        totalDurationS: directions.durationS,
        legs: directions.legs.map((leg, i) => ({
          fromId: i === 0 ? 'origin' : result!.orderedIds[i - 1],
          toId: result!.orderedIds[i],
          distanceM: leg.distanceM,
          durationS: leg.durationS,
        })),
        source: 'fallback-roads',
      };
    }
  }

  routeCache.set(cacheKey, { result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}
