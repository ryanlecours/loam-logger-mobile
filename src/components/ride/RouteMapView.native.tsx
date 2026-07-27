import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../constants/theme';
import MapView, { Polyline, type Region } from 'react-native-maps';

/**
 * Route map, native build. Draws a stored ride track on Apple Maps (iOS) or
 * Google Maps (Android).
 *
 * Metro resolves this over the plain `RouteMapView.tsx` on iOS and Android.
 * The plain file is the web/TypeScript fallback and must stay importable; see
 * its comment for why both exist.
 *
 * ANDROID: renders blank until an `androidGoogleMapsApiKey` is added to the
 * react-native-maps config plugin in app.json. Deferred deliberately, since
 * Android is not shipping yet. iOS needs no key: it uses Apple Maps by
 * default, and MapKit draws its own legal attribution.
 *
 * We never set `showsUserLocation`. Doing so would require a location
 * permission string and an App Store privacy declaration for something this
 * feature does not need: we draw a track the server already stored, and never
 * read the device's position.
 */

/** Matches web's `boundsOptions={{ padding: [20, 20] }}` in spirit: leave a
 *  margin around the track so it never runs to the edge of the frame. */
const BOUNDS_PADDING = 1.25;

/** Floor for the visible span, in degrees. A very short ride would otherwise
 *  compute a near-zero delta and open zoomed absurdly far in. */
const MIN_DELTA = 0.002;

export default function RouteMapView({
  points,
}: {
  /** [lat, lng] pairs, already downsampled server-side. */
  points: [number, number][];
}) {
  const coordinates = useMemo(
    () => points.map(([latitude, longitude]) => ({ latitude, longitude })),
    [points]
  );

  // Derive the region from the track's bounds rather than fitting via a ref
  // after mount: the first paint is then already correct, with no visible
  // snap from a default region to the route.
  const region = useMemo<Region | undefined>(() => {
    if (coordinates.length === 0) return undefined;

    let minLat = coordinates[0].latitude;
    let maxLat = coordinates[0].latitude;
    let minLng = coordinates[0].longitude;
    let maxLng = coordinates[0].longitude;

    for (const { latitude, longitude } of coordinates) {
      if (latitude < minLat) minLat = latitude;
      if (latitude > maxLat) maxLat = latitude;
      if (longitude < minLng) minLng = longitude;
      if (longitude > maxLng) maxLng = longitude;
    }

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max((maxLat - minLat) * BOUNDS_PADDING, MIN_DELTA),
      longitudeDelta: Math.max((maxLng - minLng) * BOUNDS_PADDING, MIN_DELTA),
    };
  }, [coordinates]);

  if (!region) return null;

  return (
    // pointerEvents="none" is load-bearing, not defensive. The ride detail
    // screen is a ScrollView, and this map sits inside a tap-anywhere-to-edit
    // TouchableOpacity. An interactive map would swallow vertical scroll and
    // block the edit tap. Every gesture prop below is disabled for the same
    // reason; the wrapper is the belt to their braces.
    <View style={styles.container} pointerEvents="none">
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        // The app is dark-only obsidian; app.json's "automatic" is not what it
        // actually honours. A default light map slab inside a #1a1a1a card
        // looks like a rendering bug, and these frames go into the Garmin
        // submission screenshots. iOS only; Android needs a style JSON, which
        // can wait until Android ships.
        userInterfaceStyle="dark"
        loadingEnabled
        loadingBackgroundColor={colors.card}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        // Decorative: the surrounding card and attribution carry the meaning.
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Polyline coordinates={coordinates} strokeColor={ROUTE_COLOR} strokeWidth={3} />
      </MapView>
    </View>
  );
}

/**
 * Rose-500 at 90% opacity, matching web's polyline exactly. RN's Polyline has
 * no opacity prop, so the alpha rides in the color.
 *
 * This is deliberately outside DESIGN.md's earth-tone palette. The rule there
 * governs Loam's own UI; this is a data overlay that has to stay legible on
 * third-party map tiles we do not control, in both light and dark map styles.
 */
const ROUTE_COLOR = 'rgba(244, 63, 94, 0.9)';

const styles = StyleSheet.create({
  container: {
    // 224 == web's h-56. Radius matches the card convention used throughout
    // the ride detail screen.
    height: 224,
    borderRadius: 12,
    overflow: 'hidden',
  },
});
