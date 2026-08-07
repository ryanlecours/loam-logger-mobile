import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { colors, radius } from '../../constants/theme';
import { buildChunks, type LatLngPoint } from './liveTrackChunks';

/**
 * Live map for an in-progress recording: the route so far plus a position
 * dot, following the rider until they pan away (then a re-center button
 * appears, the recorder convention).
 *
 * Metro resolves this over the plain `LiveTrackMap.tsx` on iOS and Android;
 * the plain file is the web/TypeScript fallback (see RouteMapView.tsx for
 * the two CI gates that pattern serves).
 *
 * The dot is OUR marker fed by the recorder's accepted fixes, not
 * `showsUserLocation`: the OS dot runs its own unfiltered location pipeline
 * and can sit somewhere the recorded track never went (we drop bad-accuracy
 * fixes and the (0,0) sentinel). One source of truth means the dot, the
 * line, and the stats never disagree, and a paused recorder honestly shows
 * the dot frozen where recording stopped.
 *
 * Offline behavior is a feature here, not an edge case: tiles need network,
 * but the polyline and dot are vector overlays and render over a blank
 * canvas at a no-signal trailhead. The stats block above the map stays the
 * primary "is it working" signal.
 *
 * ANDROID: tiles render blank until an androidGoogleMapsApiKey is added to
 * app.json (same standing caveat as RouteMapView.native.tsx).
 */

interface LiveTrackMapProps {
  /** The recorder's live track, mutated in place; see getTrack(). */
  track: readonly [number, number][];
  /** Change signal for `track`; also the memo key for the chunking below. */
  trackLength: number;
  lastFix: { latitude: number; longitude: number } | null;
}

/** Initial viewport span; roughly a neighborhood at trail scale. */
const INITIAL_DELTA = 0.005;

/** Same overlay red as RouteMapView.native.tsx, for the same reason: this is
 *  a data overlay on third-party tiles, deliberately outside the earth-tone
 *  palette so it stays legible on imagery we do not control. */
const ROUTE_COLOR = 'rgba(244, 63, 94, 0.9)';

export default function LiveTrackMap({ track, trackLength, lastFix }: LiveTrackMapProps) {
  const mapRef = useRef<MapView | null>(null);
  const [following, setFollowing] = useState(true);

  // Chunking lives in liveTrackChunks.ts (pure, unit-tested, including the
  // boundary-overlap behavior). The cache is ours; completed chunks keep
  // their identity across renders so they never re-cross the bridge.
  const chunkCache = useRef<LatLngPoint[][]>([]);
  const { completedChunks, tail } = useMemo(
    () => buildChunks(track, trackLength, chunkCache.current),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- track is mutated in place; trackLength is its change signal
    [trackLength],
  );

  useEffect(() => {
    if (!following || !lastFix) return;
    mapRef.current?.animateCamera({ center: lastFix }, { duration: 700 });
  }, [following, lastFix]);

  // No fix yet: hold the layout with a quiet placeholder instead of a map of
  // nowhere. The record screen's "Acquiring GPS signal" line carries the copy.
  if (!lastFix) {
    return <View style={[styles.container, styles.placeholder]} />;
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude: lastFix.latitude,
          longitude: lastFix.longitude,
          latitudeDelta: INITIAL_DELTA,
          longitudeDelta: INITIAL_DELTA,
        }}
        userInterfaceStyle="dark"
        loadingEnabled
        loadingBackgroundColor={colors.card}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        // Any manual pan means the rider wants to look around; stop fighting
        // their fingers until they ask to re-center.
        onPanDrag={() => setFollowing(false)}
        // Decorative: the stats block above carries the ride's numbers.
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {completedChunks.map((chunk, i) => (
          <Polyline key={i} coordinates={chunk} strokeColor={ROUTE_COLOR} strokeWidth={3} />
        ))}
        {tail.length > 1 && (
          <Polyline coordinates={tail} strokeColor={ROUTE_COLOR} strokeWidth={3} />
        )}
        <Marker
          coordinate={lastFix}
          anchor={{ x: 0.5, y: 0.5 }}
          flat
          // Static child: skip the per-frame view-change tracking iOS does by
          // default, which costs real CPU at a 1 Hz update rate.
          tracksViewChanges={false}
        >
          <View style={styles.positionDotOuter}>
            <View style={styles.positionDotInner} />
          </View>
        </Marker>
      </MapView>

      {!following && (
        <TouchableOpacity
          style={styles.recenterButton}
          onPress={() => setFollowing(true)}
          accessibilityRole="button"
          accessibilityLabel="Re-center map on your position"
        >
          <Ionicons name="locate" size={16} color={colors.textPrimary} />
          <Text style={styles.recenterText}>Re-center</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  placeholder: {
    backgroundColor: colors.card,
  },
  // Same overlay-legibility exception as ROUTE_COLOR: white ring + route red
  // core reads on any tile imagery.
  positionDotOuter: {
    width: 18,
    height: 18,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  positionDotInner: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    backgroundColor: 'rgba(244, 63, 94, 1)',
  },
  recenterButton: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  recenterText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
