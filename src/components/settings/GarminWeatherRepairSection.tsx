import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApolloClient } from '@apollo/client';
import { colors } from '../../constants/theme';
import { useUserTier } from '../../hooks/useUserTier';
import {
  useGarminRidesMissingCoordsQuery,
  useBackfillGarminWeatherMutation,
  GarminRidesMissingCoordsDocument,
  RidesPageDocument,
} from '../../graphql/generated';

// Garmin re-delivers activities asynchronously after a backfill is triggered,
// so wait before refetching the rides list to let the new weather tiles appear.
const REFETCH_DELAY_MS = 30_000;

type BackfillStatus = 'STARTED' | 'ALREADY_RUNNING' | 'NOT_CONNECTED' | 'NOTHING_TO_DO';

// Garmin rides imported before the coordinate fix have no location data, so
// they never got weather. This prompt re-imports them from Garmin (throttled
// server-side); weather fills in as the rides come back.
export function GarminWeatherRepairSection() {
  const router = useRouter();
  const { isPro } = useUserTier();
  const apolloClient = useApolloClient();
  const { data } = useGarminRidesMissingCoordsQuery({ fetchPolicy: 'cache-and-network' });
  const [status, setStatus] = useState<BackfillStatus | null>(null);
  const [backfill, { loading }] = useBackfillGarminWeatherMutation();

  // Cancel any pending refetch timer on unmount so we don't refetch against a
  // torn-down cache if the user leaves Settings right after triggering.
  const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (refetchTimerRef.current) {
        clearTimeout(refetchTimerRef.current);
        refetchTimerRef.current = null;
      }
    };
  }, []);

  const missing = data?.me?.garminRidesMissingCoords ?? 0;

  if (missing === 0 && status === null) return null;

  const onPress = async () => {
    if (!isPro) {
      Alert.alert('Pro Feature', 'Fetching weather for past rides is a Pro feature.', [
        { text: 'OK' },
        { text: 'Upgrade', onPress: () => router.push('/settings-detail/pricing') },
      ]);
      return;
    }
    try {
      const res = await backfill({ refetchQueries: [{ query: GarminRidesMissingCoordsDocument }] });
      const next = (res.data?.backfillGarminWeather?.status ?? null) as BackfillStatus | null;
      setStatus(next);

      if (next === 'STARTED' || next === 'ALREADY_RUNNING') {
        if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
        refetchTimerRef.current = setTimeout(() => {
          refetchTimerRef.current = null;
          apolloClient.refetchQueries({ include: [RidesPageDocument] }).catch(() => {});
        }, REFETCH_DELAY_MS);
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  const inProgress = status === 'STARTED' || status === 'ALREADY_RUNNING';

  const subtitle = (() => {
    switch (status) {
      case 'STARTED':
      case 'ALREADY_RUNNING':
        return "Re-importing from Garmin. Weather will appear as your rides come back — this can take a few minutes.";
      case 'NOT_CONNECTED':
        return 'Connect your Garmin account to import weather for past rides.';
      case 'NOTHING_TO_DO':
        return 'All your Garmin rides already have location data.';
      default:
        return `${missing} Garmin ride${missing === 1 ? '' : 's'} imported without location data, so ${missing === 1 ? 'it has' : 'they have'} no weather.`;
    }
  })();

  const buttonDisabled = loading || inProgress || status === 'NOTHING_TO_DO';

  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeader}>GARMIN WEATHER</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Ionicons name="partly-sunny-outline" size={22} color={colors.primary} />
          <View style={styles.text}>
            <Text style={styles.title}>Weather for past Garmin rides</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.button, { borderColor: isPro ? colors.primary : colors.textMuted }]}
          onPress={onPress}
          disabled={buttonDisabled}
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
                {!isPro ? 'Pro feature' : inProgress ? 'Importing…' : 'Re-import'}
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
