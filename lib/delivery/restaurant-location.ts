// Single source of truth for the restaurant origin (Awka kitchen). Previously
// duplicated across the batch map, dispatch components, route optimizer, and
// auto-assign — drift between them silently broke routing.

export const RESTAURANT_LATITUDE = 6.203072;
export const RESTAURANT_LONGITUDE = 7.063700;

// Mapbox uses [lng, lat] tuples
export const RESTAURANT_LNG_LAT: [number, number] = [
  RESTAURANT_LONGITUDE,
  RESTAURANT_LATITUDE,
];

export const RESTAURANT_LOCATION = {
  lat: RESTAURANT_LATITUDE,
  lng: RESTAURANT_LONGITUDE,
} as const;
