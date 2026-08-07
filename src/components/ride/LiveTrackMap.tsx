/**
 * Live recording map, web/fallback build. Renders nothing.
 *
 * Exists for the same two resolvers as RouteMapView.tsx (see its comment):
 * Metro must never reach react-native-maps on the web export, and tsc needs
 * a plain .tsx to resolve the import. Keep this signature identical to the
 * native implementation.
 */
export default function LiveTrackMap(_props: {
  track: readonly [number, number][];
  trackLength: number;
  lastFix: { latitude: number; longitude: number } | null;
}) {
  return null;
}
