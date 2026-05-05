// Stable per-driver color assignment for the dispatch board. Same palette is
// used for the route line, the rider chip on the map, and the swatch in the
// roster panel — operators read by colour, not driver ID.

const PALETTE = [
  '#f97316', // orange
  '#10b981', // emerald
  '#3b82f6', // blue
  '#a855f7', // purple
  '#ef4444', // red
  '#eab308', // yellow
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
  '#f59e0b', // amber
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function colorForDriver(driverId: string): string {
  return PALETTE[hashStr(driverId) % PALETTE.length];
}
