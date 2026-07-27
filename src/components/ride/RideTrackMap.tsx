import { StyleSheet, Text, View } from 'react-native';
import { RideTrackStatus, useRideTrackQuery } from '../../graphql/generated';
import { colors } from '../../constants/theme';
import { GarminSourceLine } from '../attribution/GarminAttribution';
import RouteMapView from './RouteMapView';

/**
 * Route map for one ride.
 *
 * Self-hiding, following the MaintenanceSummary convention: it renders a
 * skeleton while the first query is in flight, the map once a track exists,
 * and otherwise nothing at all. No empty state, because "no track" is the
 * common case rather than an error worth explaining. Most rides have no
 * stored stream: manual, WHOOP and Suunto rides never do, and Garmin rides
 * only do when Activity Details carried GPS samples at ingest.
 *
 * Imports `./RouteMapView`, never `react-native-maps` directly, so this file
 * stays safe for the web bundle. See RouteMapView.tsx for why that matters.
 *
 * NOT HANDLED: status FETCHABLE, where a legacy Strava ride has coordinates
 * but no stored stream yet. Web offers a "Load route map" button that fires
 * requestRideTrack and polls. That flow is deliberately out of scope here and
 * collapses to nothing. Garmin rides are never FETCHABLE by design: their
 * streams arrive pushed at ingest and are never fetched on demand.
 */
export function RideTrackMap({ rideId }: { rideId: string }) {
  // `error` is deliberately not read: see the `!track` guard below.
  const { data, loading } = useRideTrackQuery({
    variables: { rideId },
    fetchPolicy: 'cache-and-network',
  });

  const track = data?.rideTrack;

  if (loading && !track) {
    return (
      <View style={styles.card}>
        <View style={styles.skeleton} />
      </View>
    );
  }

  // Deliberately `!track`, NOT `error || !track`.
  //
  // Under cache-and-network Apollo keeps `data` populated from the cache when a
  // BACKGROUND refetch fails: the hook reports `error` truthy and `data` intact
  // (verified for both errorPolicy 'none' and 'all'). Collapsing on `error`
  // alone therefore made an already-rendered map vanish on a passing network
  // blip, which is worse than the stale frame it replaced.
  //
  // `!track` alone is the honest test for "we truly have nothing": a first load
  // that fails has no cached data to fall back on, so `track` is undefined and
  // we collapse anyway. That path is intentional too, since getRideTrack throws
  // "Ride not found" for a missing ride and another user's ride alike, and the
  // surrounding screen already renders its own not-found state.
  if (!track) return null;

  if (track.status !== RideTrackStatus.Available) return null;

  const points = track.points as [number, number][] | null | undefined;
  if (!points?.length) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Route</Text>
      <RouteMapView points={points} />
      {/*
        Attribution is gated on the TRACK's source, never on the ride's
        garminActivityId. A ride matched across providers carries both
        activity ids but only one persisted stream, so the ride field would
        credit Garmin for a Strava-recorded track. See the contract in
        GarminAttribution.tsx.

        A rendered map of device-recorded GPS is a "visual" under the Garmin
        API Brand Guidelines and must carry "Garmin [device model]" adjacent
        to it. It sits directly below the map, always visible, never inside a
        collapsed container.
      */}
      {track.source === 'garmin' && (
        <GarminSourceLine deviceName={track.garminDeviceName} style={styles.attribution} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Matches the card block duplicated across the ride detail screen and
  // WeatherCard. There is no shared Card component in this repo.
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Static gray block, matching the repo's other skeletons. Sized to the map
  // so the card does not resize when the track lands.
  skeleton: {
    height: 224,
    borderRadius: 12,
    backgroundColor: colors.cardBorder,
  },
  attribution: {
    marginTop: 8,
  },
});
