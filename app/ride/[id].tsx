import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter, Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { NetworkStatus } from '@apollo/client';
import { useRideQuery, useDeleteRideMutation, useUpdateRideMutation } from '../../src/graphql/generated';
import { colors, radius } from '../../src/constants/theme';
import {
  formatGarminSource,
  garminSourceDevice,
  hasGarminData,
} from '../../src/constants/garminAttribution';
import { useBikesWithPredictions } from '../../src/hooks/useBikesWithPredictions';
import {
  formatDuration,
  formatElevation,
} from '../../src/utils/greetingMessages';
import { useDistanceUnit } from '../../src/hooks/useDistanceUnit';
import { useUserTier } from '../../src/hooks/useUserTier';
import { WeatherCard } from '../../src/components/ride/WeatherCard';
import { RideTrackMap } from '../../src/components/ride/RideTrackMap';
import { UpsellCard } from '../../src/components/common/UpgradePrompt';
import { useShareRideOverlay } from '../../src/hooks/useShareRideOverlay';
// Doubles as the in-flight key for the picker's "Not my bike" row: it shares
// `assigningBikeId` with the real bike rows so one write disables the list.
import { UNOWNED_BIKE_VALUE } from '../../src/constants/rideBike';

type IconName = keyof typeof Ionicons.glyphMap;

function getRideTypeLabel(rideType: string): string {
  const labels: Record<string, string> = {
    TRAIL: 'Trail',
    ENDURO: 'Enduro',
    DOWNHILL: 'Downhill',
    XC: 'Cross Country',
    GRAVEL: 'Gravel',
    ROAD: 'Road',
    COMMUTE: 'Commute',
    TRAINER: 'Trainer',
  };
  return labels[rideType] || rideType;
}

function getRideTypeIcon(rideType: string): IconName {
  const icons: Record<string, IconName> = {
    TRAIL: 'leaf-outline',
    ENDURO: 'flash-outline',
    DOWNHILL: 'arrow-down-outline',
    XC: 'fitness-outline',
    GRAVEL: 'analytics-outline',
    ROAD: 'speedometer-outline',
    COMMUTE: 'briefcase-outline',
    TRAINER: 'home-outline',
  };
  return icons[rideType] || 'bicycle-outline';
}

/** Badges for every provider that contributed data to this ride. */
function getSourceInfo(ride: {
  garminActivityId?: string | null;
  garminDeviceName?: string | null;
  stravaActivityId?: string | null;
  stravaDeviceName?: string | null;
  whoopWorkoutId?: string | null;
  suuntoWorkoutId?: string | null;
}): { label: string; color: string }[] {
  const badges: { label: string; color: string }[] = [];
  if (ride.stravaActivityId) {
    badges.push({ label: 'Synced from Strava', color: colors.strava });
  }
  // Attributed as "Garmin [device model]", not "Synced from Garmin": the
  // guidelines require the device model on detail screens and treat a reworded
  // attribution as noncompliant. Emitted whenever Garmin data is present, even
  // alongside another provider — a cross-provider ride still contains Garmin
  // device-sourced data, and dropping the attribution there is exactly the kind
  // of omission the guidelines are aimed at. hasGarminData/garminSourceDevice
  // also cover a ride recorded on a Garmin unit but imported purely via Strava
  // (no garminActivityId), where the device comes from Strava's device_name.
  if (hasGarminData(ride)) {
    badges.push({ label: formatGarminSource(garminSourceDevice(ride)), color: colors.garmin });
  }
  if (ride.whoopWorkoutId) {
    badges.push({ label: 'Synced from WHOOP', color: colors.whoop });
  }
  if (ride.suuntoWorkoutId) {
    badges.push({ label: 'Synced from Suunto', color: colors.suunto });
  }
  return badges;
}

export default function RideDetailScreen() {
  // The bike-pick push still deep-links here with `?action=pickBike`, and it is
  // deliberately absent from this type: nothing on this screen reads it any
  // more, because the picker below opens for every unassigned ride. The
  // notification only has to land on the right ride now.
  //
  // The API keeps sending it regardless, and should: app versions up to 1.1.3
  // gate their picker on that param, so dropping it would leave those installs
  // deep-linking to a ride with no picker at all.
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { formatDistance, distanceUnit } = useDistanceUnit();
  const { isFree } = useUserTier();
  const [deleting, setDeleting] = useState(false);
  // shareSurface is a JSX VALUE (rendered inline below as `{shareSurface}`),
  // not a component (rendered as `<ShareSurface />`). Returning a component
  // here would unmount/remount the off-screen capture node on every state
  // change inside the hook — see comment in useShareRideOverlay for details.
  const { sharing, openShareSheet, shareSurface } = useShareRideOverlay();

  // Single-ride lookup by id. Earlier this screen pulled `useRidesPageQuery
  // ({ take: 100 })` and located the target via `data.rides.find()`, which
  // failed for any ride that fell outside the first 100 (older backfilled
  // rides, users with deep histories, etc.) — the deep-link from the
  // bike-pick notification would land on "Ride not found" through no fault
  // of the user.
  //
  // The dedicated `Ride(id)` query (server resolver in
  // apps/api/src/graphql/resolvers.ts) sidesteps the entire pagination
  // class of races. `cache-and-network` keeps the existing snappy-first-
  // paint + background-refresh behavior; `notifyOnNetworkStatusChange`
  // makes the `loading` flag track in-flight fetches during the cached
  // emission window, which the not-found guard below relies on.
  const { data, loading, error, networkStatus, refetch } = useRideQuery({
    variables: { id: id! },
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });

  const { bikes } = useBikesWithPredictions();
  const [deleteRide] = useDeleteRideMutation();
  const [updateRide] = useUpdateRideMutation();
  // Once the rider picks, hide the picker locally so it doesn't briefly
  // re-render before the cache refetch settles.
  const [justAssigned, setJustAssigned] = useState(false);
  // Track which specific bike row is being assigned. The mutation's own
  // `loading` flag is global to the mutation hook, so using it would render
  // a spinner on every row simultaneously when the user taps one — they'd
  // get no visual confirmation of which bike they actually picked. Storing
  // the in-flight bikeId here lets us spin only the tapped row while still
  // disabling the whole list to prevent concurrent taps.
  const [assigningBikeId, setAssigningBikeId] = useState<string | null>(null);

  const ride = data?.ride ?? null;

  const getBikeName = useCallback(
    (bikeId: string | null | undefined): string | undefined => {
      if (!bikeId) return undefined;
      const bike = bikes.find((b) => b.id === bikeId);
      if (!bike) return undefined;
      return bike.nickname || `${bike.manufacturer} ${bike.model}`;
    },
    [bikes]
  );

  const handleEdit = () => {
    router.push(`/ride/edit/${id}` as Href);
  };

  const handleShare = useCallback(() => {
    if (!ride) return;
    // Pre-format here using the user's preferred units so the share card
    // shows the same numbers the rest of the app shows. averageHr stays
    // null when the ride has no HR data — the share sheet renders that
    // toggle as disabled rather than hiding it, so the user knows the
    // field exists but isn't available for this particular ride.
    openShareSheet({
      distance: formatDistance(ride.distanceMeters),
      elevation: formatElevation(ride.elevationGainMeters, distanceUnit),
      duration: formatDuration(ride.durationSeconds),
      averageHr: ride.averageHr ? `${ride.averageHr} bpm` : null,
    });
  }, [ride, openShareSheet, formatDistance, distanceUnit]);

  const handlePickBike = useCallback(
    async (bikeId: string) => {
      setAssigningBikeId(bikeId);
      try {
        await updateRide({
          variables: { id: id!, input: { bikeId } },
          refetchQueries: ['RidesPage', 'RecentRides', 'UnassignedRideCount'],
        });
        setJustAssigned(true);
      } catch (err) {
        Alert.alert(
          'Could not assign bike',
          err instanceof Error ? err.message : 'Please try again.'
        );
      } finally {
        setAssigningBikeId(null);
      }
    },
    [updateRide, id]
  );

  // "Not my bike": a demo, loaner, rental or a friend's bike. Recorded as an
  // answer rather than a dismissal, so the ride stops being counted as
  // outstanding without pretending it was ridden on gear the rider maintains.
  // The server clears any bikeId alongside this and returns that bike's hours.
  const handleUnownedBike = useCallback(async () => {
    setAssigningBikeId(UNOWNED_BIKE_VALUE);
    try {
      await updateRide({
        variables: { id: id!, input: { unownedBike: true } },
        refetchQueries: ['RidesPage', 'RecentRides', 'UnassignedRideCount'],
      });
      setJustAssigned(true);
    } catch (err) {
      Alert.alert(
        'Could not update ride',
        err instanceof Error ? err.message : 'Please try again.'
      );
    } finally {
      setAssigningBikeId(null);
    }
  }, [updateRide, id]);

  const handleDelete = () => {
    Alert.alert(
      'Delete Ride',
      'Are you sure you want to delete this ride? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteRide({
                variables: { id: id! },
                refetchQueries: ['RidesPage', 'RecentRides', 'UnassignedRideCount'],
              });
              router.back();
            } catch (_error) {
              Alert.alert('Error', 'Failed to delete ride');
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  // Show the loading state ONLY when the ride isn't yet available — covers
  // initial mount with no cache and the deep-link case where the cached
  // list pre-dated the just-synced ride and a background refetch is mid-flight.
  // Critically, gating on `!ride` first means rides that ARE in the cache
  // render immediately on navigation; we don't briefly flash a spinner over
  // stale-but-correct data while the background refetch settles.
  //
  // `isRefetching` is technically redundant under `notifyOnNetworkStatusChange:
  // true` (loading already flips true for any networkStatus < ready,
  // including refetch=4), but keeping it explicit guards the intent if a
  // future contributor removes notifyOnNetworkStatusChange.
  const isRefetching = networkStatus === NetworkStatus.refetch;
  if (!ride && (loading || isRefetching)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !ride) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons
          name="alert-circle-outline"
          size={48}
          color={error ? colors.criticalOn : colors.textMuted}
        />
        <Text style={styles.errorText}>
          {error ? 'Failed to load ride' : 'Ride not found'}
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const startDate = new Date(ride.startTime);
  const formattedDate = startDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = startDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const bikeName = getBikeName(ride.bikeId);
  const sourceInfo = getSourceInfo(ride);

  // Shown for ANY unassigned ride, not just one reached from the
  // "Which bike did you ride?" push (which arrives as action=pickBike).
  // Garmin never reports gear, so on a multi-bike account every Garmin ride
  // lands here unassigned; gating the only in-app assignment UI behind that
  // notification meant a missed or dismissed push stranded the ride with no
  // route to a bike at all, and its hours reached no component.
  // `unownedBike` is the rider having already answered "it wasn't mine", so the
  // picker stays closed for those rides. They can still change it from the edit
  // screen, which is the way back if they marked one by mistake.
  //
  // Deliberately NOT gated on `bikes.length > 0`. With no bikes on the account
  // there is nothing to assign, but "Not my bike" is still a valid and useful
  // answer, and it is the whole reason a rider with no bikes has unassigned
  // rides sitting around. Hiding the card meant the edit screen was the only
  // way out, which is the same trap this screen was fixed to escape. The copy
  // below adapts rather than asking which bike they rode when there are none.
  const showBikePicker = !ride.bikeId && !ride.unownedBike && !justAssigned;
  const hasBikesToPick = bikes.length > 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        // Bind to NetworkStatus.refetch (i.e. user-triggered refetch) only —
        // `loading` is true for any in-flight fetch including the background
        // cache-and-network refresh on mount, which would otherwise animate
        // the pull-to-refresh spinner without the user pulling. Mirrors the
        // pattern in app/bike/[id].tsx.
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={colors.primary}
        />
      }
    >
      {/* Inline bike picker. Sits OUTSIDE the tap-to-edit touchable so tapping
          its title or subtitle text doesn't bubble up to handleEdit and
          navigate the user away from the picker. Rendered first in the
          ScrollView so an unassigned ride opens on the one thing it's missing
          rather than burying it below header/stats/weather. */}
      {showBikePicker && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            {hasBikesToPick ? 'Which bike did you ride?' : 'This ride has no bike'}
          </Text>
          <Text style={styles.pickerSubtitle}>
            {hasBikesToPick
              ? 'Tap to assign this ride so component hours track correctly.'
              : 'You have no bikes yet. Add one in Gear to start tracking hours, or mark this as a bike you do not own.'}
          </Text>
          {bikes.map((bike) => {
            const label = bike.nickname || `${bike.manufacturer} ${bike.model}`;
            const isAssigningThis = assigningBikeId === bike.id;
            return (
              <TouchableOpacity
                key={bike.id}
                style={[
                  styles.bikePickerRow,
                  // Dim the non-tapped rows during an in-flight assignment
                  // so users can see they won't respond. The tapped row
                  // keeps full opacity since its spinner already conveys
                  // "this one is processing."
                  !!assigningBikeId && !isAssigningThis && styles.bikePickerRowDisabled,
                ]}
                onPress={() => handlePickBike(bike.id)}
                // Disable every row while any assignment is in flight to
                // prevent rapid double-taps that would race the mutation,
                // but only show the spinner on the row the user actually
                // tapped so they get clear visual feedback.
                disabled={!!assigningBikeId}
                activeOpacity={0.7}
              >
                <Ionicons name="bicycle" size={20} color={colors.textMuted} />
                <Text style={styles.bikePickerLabel}>{label}</Text>
                {isAssigningThis ? (
                  <ActivityIndicator size="small" color={colors.textMuted} />
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                )}
              </TouchableOpacity>
            );
          })}

          {/* Escape hatch for a bike the rider doesn't own. Without it the only
              ways to clear this prompt are to leave it forever or to assign a
              bike that never turned a wheel on this ride, which is the one
              thing that would corrupt the wear math. */}
          <TouchableOpacity
            style={[
              styles.bikePickerRow,
              !!assigningBikeId &&
                assigningBikeId !== UNOWNED_BIKE_VALUE &&
                styles.bikePickerRowDisabled,
            ]}
            onPress={handleUnownedBike}
            disabled={!!assigningBikeId}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Not my bike. A demo, loaner or rental. Records no component hours."
          >
            <Ionicons name="help-circle-outline" size={20} color={colors.textMuted} />
            <View style={styles.unownedCopy}>
              <Text style={styles.unownedLabel}>Not my bike</Text>
              <Text style={styles.unownedHint}>Demo, loaner or rental</Text>
            </View>
            {assigningBikeId === UNOWNED_BIKE_VALUE ? (
              <ActivityIndicator size="small" color={colors.textMuted} />
            ) : (
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            )}
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity activeOpacity={0.7} onPress={handleEdit}>
        {/* Header Card */}
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.typeContainer}>
              <Ionicons
                name={getRideTypeIcon(ride.rideType)}
                size={24}
                color={colors.primary}
              />
              <Text style={styles.typeLabel}>{getRideTypeLabel(ride.rideType)}</Text>
            </View>
            {sourceInfo.map((badge) => (
              <View
                key={badge.label}
                style={[styles.sourceBadge, { backgroundColor: badge.color }]}
              >
                <Text style={styles.sourceBadgeText}>{badge.label}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.date}>{formattedDate}</Text>
          <Text style={styles.time}>{formattedTime}</Text>

          {ride.location && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={16} color={colors.textMuted} />
              <Text style={styles.location}>{ride.location}</Text>
            </View>
          )}
        </View>

        {/* Route Map — self-hiding. Renders only when the server has a stored
            GPS track for this ride, which excludes manual/WHOOP/Suunto rides
            entirely and any Garmin ride whose Activity Details carried no
            samples. Sits inside the tap-to-edit TouchableOpacity on purpose:
            the map is non-interactive (pointerEvents="none"), so it neither
            swallows vertical scroll nor blocks the edit tap. */}
        <RideTrackMap rideId={ride.id} />

        {/* Stats Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={20} color={colors.textMuted} />
              <Text style={styles.statValue}>{formatDuration(ride.durationSeconds)}</Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="navigate-outline" size={20} color={colors.textMuted} />
              <Text style={styles.statValue}>{formatDistance(ride.distanceMeters)}</Text>
              <Text style={styles.statLabel}>Distance</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="trending-up-outline" size={20} color={colors.textMuted} />
              <Text style={styles.statValue}>{formatElevation(ride.elevationGainMeters, distanceUnit)}</Text>
              <Text style={styles.statLabel}>Elevation</Text>
            </View>
            {ride.averageHr && (
              <View style={styles.statItem}>
                <Ionicons name="heart-outline" size={20} color={colors.textMuted} />
                <Text style={styles.statValue}>{ride.averageHr} bpm</Text>
                <Text style={styles.statLabel}>Avg HR</Text>
              </View>
            )}
          </View>
        </View>

        {/* Weather Card — Pro-only; free users see the weather upsell where it would render */}
        {ride.weather ? (
          <WeatherCard weather={ride.weather} distanceUnit={distanceUnit} />
        ) : (
          isFree && <UpsellCard feature="weather" />
        )}

        {/* Bike Card. Shown for an unowned ride too, so "not my bike" reads as
            a recorded fact the rider can see and edit rather than a silently
            missing section. */}
        {(bikeName || ride.unownedBike) && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Bike</Text>
            <View style={styles.bikeRow}>
              <Ionicons
                name={ride.unownedBike ? 'help-circle-outline' : 'bicycle'}
                size={20}
                color={colors.textMuted}
              />
              <Text style={styles.bikeName}>
                {ride.unownedBike ? 'Not my bike' : bikeName}
              </Text>
            </View>
            {ride.unownedBike && (
              <Text style={styles.unownedHint}>
                Demo, loaner or rental. No component hours recorded.
              </Text>
            )}
          </View>
        )}

        {/* Notes Card */}
        {ride.notes && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notes}>{ride.notes}</Text>
          </View>
        )}

        {/* Tap to edit hint */}
        <View style={styles.editHint}>
          <Ionicons name="pencil-outline" size={14} color={colors.textMuted} />
          <Text style={styles.editHintText}>Tap anywhere to edit</Text>
        </View>
      </TouchableOpacity>

      {/* Action Row — Share and Delete sit side-by-side. Share produces a
          transparent PNG overlay (logo + distance/elevation/duration/HR
          row) the user can drop onto an Instagram story or other social
          post. See useShareRideOverlay for the capture pipeline. */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShare}
          disabled={sharing}
        >
          {sharing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <Ionicons name="share-outline" size={18} color={colors.primary} />
              <Text style={styles.shareButtonText}>Share</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator size="small" color={colors.criticalOn} />
          ) : (
            <>
              <Ionicons name="trash-outline" size={18} color={colors.criticalOn} />
              <Text style={styles.deleteButtonText}>Delete</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Share overlay surface: customization sheet + off-screen capture
          mount. Rendered as a JSX value (not a component) so React
          reconciles by element type + position and the underlying native
          view behind cardRef stays mounted across state changes — what
          captureRef needs to produce a non-stale PNG. */}
      {shareSurface}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: 12,
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  backButtonText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  sourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  sourceBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  date: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  time: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  location: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statItem: {
    // Same two-across grid as the component sheets: 50% pinned it to two
    // columns at every text size. This screen is one tap from the dashboard's
    // recent-rides list, so it gets the same reflow.
    minWidth: 140,
    flexGrow: 1,
    flexBasis: '50%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 6,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  bikeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bikeName: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  pickerSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: -8,
    marginBottom: 12,
  },
  bikePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
  },
  bikePickerRowDisabled: {
    opacity: 0.4,
  },
  bikePickerLabel: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
  },
  unownedCopy: {
    flex: 1,
  },
  // Not `bikePickerLabel`: that one carries flex: 1 to fill the row, which
  // inside this two-line column would stretch the text box vertically.
  unownedLabel: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  unownedHint: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  notes: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  editHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  editHintText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 12,
    borderRadius: radius.full,
  },
  shareButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.criticalBorder,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.criticalOn,
  },
});
