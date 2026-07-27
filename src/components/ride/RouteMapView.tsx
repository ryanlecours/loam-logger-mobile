/**
 * Route map, web/fallback build. Renders nothing.
 *
 * THIS FILE EXISTS FOR TWO RESOLVERS, and removing it breaks CI in two ways.
 *
 * 1. Metro picks `RouteMapView.native.tsx` on iOS and Android, and falls back
 *    to this plain `.tsx` on web. CI runs `npx expo export --platform web` as
 *    a hard gate and `react-native-maps` does not bundle for web, so the web
 *    build must never reach that import. Keeping the native map behind the
 *    `.native` extension is what guarantees it.
 * 2. TypeScript does not follow React Native's platform extensions, and Expo's
 *    base tsconfig does not set `moduleSuffixes`. Without a plain `.tsx` here,
 *    `import RouteMapView from './RouteMapView'` fails `tsc --noEmit`, which is
 *    also a CI gate.
 *
 * The mobile web export is only a bundling smoke test, never deployed, so
 * having no map there costs nothing.
 *
 * Keep this signature identical to the native implementation.
 */
export default function RouteMapView(_props: {
  /** [lat, lng] pairs, already downsampled server-side. */
  points: [number, number][];
}) {
  return null;
}
