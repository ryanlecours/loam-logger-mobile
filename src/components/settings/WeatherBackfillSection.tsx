import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApolloClient } from '@apollo/client';
import { colors } from '../../constants/theme';
import { useUserTier } from '../../hooks/useUserTier';
import {
  useRidesMissingWeatherQuery,
  useBackfillWeatherForMyRidesMutation,
  RidesPageDocument,
} from '../../graphql/generated';

// Workers drain asynchronously after a backfill returns, so we wait this long
// before refetching the rides list so the newly-populated weather tiles
// actually appear. Stragglers catch up on next navigation via the list
// query's cache-and-network fetch policy.
const REFETCH_DELAY_MS = 15_000;

export function WeatherBackfillSection() {
  const router = useRouter();
  const { isPro } = useUserTier();
  const apolloClient = useApolloClient();
  const { data } = useRidesMissingWeatherQuery({ fetchPolicy: 'cache-and-network' });
  const [lastResult, setLastResult] = useState<{
    enqueued: number;
    remaining: number;
    withoutCoords: number;
  } | null>(null);
  const [backfill, { loading }] = useBackfillWeatherForMyRidesMutation();

  // Track any pending refetch timer so we can cancel it on unmount.
  // Without this, a user who queues a backfill and immediately leaves
  // Settings would fire a refetch against a possibly-torn-down cache.
  const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (refetchTimerRef.current) {
        clearTimeout(refetchTimerRef.current);
        refetchTimerRef.current = null;
      }
    };
  }, []);

  const missing = data?.me?.ridesMissingWeather ?? 0;
  const hasMore = (lastResult?.remaining ?? 0) > 0;

  if (missing === 0 && lastResult === null) return null;

  const onPress = async () => {
    if (!isPro) {
      Alert.alert(
        'Pro Feature',
        'Fetching weather for past rides is a Pro feature.',
        [
          { text: 'OK' },
          { text: 'Upgrade', onPress: () => router.push('/settings-detail/pricing') },
        ]
      );
      return;
    }
    try {
      const res = await backfill({ refetchQueries: ['RidesMissingWeather'] });
      const r = res.data?.backfillWeatherForMyRides;
      const enqueued = r?.enqueuedCount ?? 0;
      setLastResult({
        enqueued,
        remaining: r?.remainingAfterBatch ?? 0,
        withoutCoords: r?.ridesWithoutCoords ?? 0,
      });

      // Delayed refetch of the rides list so newly-fetched weather tiles
      // render without requiring the user to re-navigate. Mirrors the
      // equivalent web behavior in apps/web/src/components/WeatherBackfillSection.tsx.
      if (enqueued > 0) {
        if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
        refetchTimerRef.current = setTimeout(() => {
          refetchTimerRef.current = null;
          apolloClient
            .refetchQueries({ include: [RidesPageDocument] })
            .catch(() => {});
        }, REFETCH_DELAY_MS);
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeader}>DATA MANAGEMENT</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Ionicons name="partly-sunny-outline" size={22} color={colors.primary} />
          <View style={styles.text}>
            <Text style={styles.title}>Weather for past rides</Text>
            {lastResult !== null ? (
              <Text style={styles.subtitle}>
                {hasMore
                  ? `Queued ${lastResult.enqueued} ride${lastResult.enqueued === 1 ? '' : 's'}. ${lastResult.remaining} more remain — tap Fetch more when these finish.`
                  : `Queued ${lastResult.enqueued} ride${lastResult.enqueued === 1 ? '' : 's'}. Weather will appear as it's fetched.`}
              </Text>
            ) : (
              <Text style={styles.subtitle}>
                {missing} ride{missing === 1 ? '' : 's'} missing weather data.
              </Text>
            )}
            {lastResult !== null && lastResult.withoutCoords > 0 && (
              <Text style={[styles.subtitle, styles.noCoordsNote]}>
                {lastResult.withoutCoords} ride
                {lastResult.withoutCoords === 1 ? '' : 's'} can't get weather —
                no GPS data on file.
              </Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={[styles.button, { borderColor: isPro ? colors.primary : colors.textMuted }]}
          onPress={onPress}
          disabled={loading || (lastResult !== null && !hasMore)}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <Ionicons
                name={isPro ? 'cloud-download-outline' : 'lock-closed-outline'}
                size={16}
                color={isPro ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.buttonText, { color: isPro ? colors.primary : colors.textMuted }]}>
                {!isPro
                  ? 'Pro feature'
                  : lastResult === null
                    ? 'Fetch weather'
                    : hasMore
                      ? 'Fetch more'
                      : 'Queued'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 24 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    gap: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  text: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  noCoordsNote: { marginTop: 4, fontSize: 12 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  buttonText: { fontSize: 14, fontWeight: '600' },
});
