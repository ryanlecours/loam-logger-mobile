import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { useDistanceUnit } from '../../src/hooks/useDistanceUnit';
import { useAddRideMutation, type AddRideInput } from '../../src/graphql/generated';
import { useBikesWithPredictions } from '../../src/hooks/useBikesWithPredictions';
import { submitRideResilient } from '../../src/lib/submitRide';
import { rideRecorder } from '../../src/lib/recording/recorder';
import { PickerSelect } from '../../src/components/common/PickerSelect';
import { UNOWNED_BIKE_VALUE } from '../../src/constants/rideBike';
import { formatDuration, formatElevation } from '../../src/utils/greetingMessages';
import { colors, radius } from '../../src/constants/theme';

const RIDE_TYPES = [
  { value: 'TRAIL', label: 'Trail' },
  { value: 'ENDURO', label: 'Enduro' },
  { value: 'XC', label: 'Cross Country' },
  { value: 'DOWNHILL', label: 'Downhill' },
  { value: 'GRAVEL', label: 'Gravel' },
  { value: 'ROAD', label: 'Road' },
  { value: 'COMMUTE', label: 'Commute' },
];

/**
 * Save screen for a just-finished recording. The metrics are what the GPS
 * measured, shown but not editable (the phase-2 trim control is the
 * sanctioned way to correct them); the rider only supplies what the phone
 * cannot know: which bike, what kind of ride, notes.
 */
export default function SaveRecordingScreen() {
  const router = useRouter();
  const { bikes } = useBikesWithPredictions();
  const [addRide, { loading }] = useAddRideMutation();
  const { formatDistance, distanceUnit } = useDistanceUnit();

  // Snapshot once: the recorder is stopped, its summary is stable, and the
  // memo keeps it from vanishing mid-render if clear() runs during save.
  const summary = useMemo(() => rideRecorder.getSummary(), []);

  const [rideType, setRideType] = useState('TRAIL');
  const [bikeId, setBikeId] = useState(bikes[0]?.id || '');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const handleSave = async () => {
    if (!bikeId && bikes.length > 0) {
      Alert.alert('Validation Error', 'Please select a bike');
      return;
    }
    const unownedBike = bikeId === UNOWNED_BIKE_VALUE;

    const input: AddRideInput = {
      startTime: new Date(summary.startedAt).toISOString(),
      durationSeconds: summary.durationSeconds,
      distanceMeters: summary.distanceMeters,
      elevationGainMeters: summary.elevationGainMeters,
      rideType,
      bikeId: unownedBike ? null : bikeId || null,
      unownedBike,
      location: location || null,
      notes: notes || null,
      // Where the ride began; unlocks weather (and later lift detection)
      // server-side, same as a provider-synced ride.
      startLat: summary.startLat,
      startLng: summary.startLng,
      clientMutationId: Crypto.randomUUID(),
    };

    try {
      const outcome = await submitRideResilient(input, () =>
        addRide({
          variables: { input },
          refetchQueries: ['RidesPage', 'RecentRides', 'UnassignedRideCount'],
        }),
      );
      await rideRecorder.clear();
      if (outcome === 'queued') {
        Alert.alert(
          'Ride saved on this phone',
          "No connection right now. Your ride will upload automatically once you're back in signal.",
        );
      }
      router.dismissTo('/(tabs)/rides');
    } catch (_error) {
      // Deterministic rejection only; transient failures were queued. The
      // recording is NOT cleared, so the rider can fix and retry.
      Alert.alert('Error', 'Failed to save ride. Please try again.');
    }
  };

  const handleDiscard = useCallback(() => {
    Alert.alert('Discard this ride?', 'The recording will be deleted.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          void rideRecorder.clear().then(() => router.dismissTo('/(tabs)/rides'));
        },
      },
    ]);
  }, [router]);

  // Android hardware back would otherwise pop this screen and strand the
  // finished-but-unsaved recording (the header back and swipe gesture are
  // already disabled in the layout). The only exits are Save and Discard.
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        handleDiscard();
        return true;
      });
      return () => subscription.remove();
    }, [handleDiscard]),
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* What the GPS measured */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryStat}>
          <Ionicons name="time-outline" size={16} color={colors.textMuted} />
          <Text style={styles.summaryValue}>{formatDuration(summary.durationSeconds)}</Text>
        </View>
        <View style={styles.summaryStat}>
          <Ionicons name="navigate-outline" size={16} color={colors.textMuted} />
          <Text style={styles.summaryValue}>{formatDistance(summary.distanceMeters)}</Text>
        </View>
        <View style={styles.summaryStat}>
          <Ionicons name="trending-up-outline" size={16} color={colors.textMuted} />
          <Text style={styles.summaryValue}>
            {formatElevation(summary.elevationGainMeters, distanceUnit)}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ride Type</Text>
        <PickerSelect selectedValue={rideType} onValueChange={setRideType} options={RIDE_TYPES} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bike</Text>
        <PickerSelect
          selectedValue={bikeId}
          onValueChange={setBikeId}
          options={[
            ...bikes.map((bike) => ({
              label: bike.nickname || `${bike.manufacturer} ${bike.model}`,
              value: bike.id,
            })),
            { label: 'Not my bike (demo or loaner)', value: UNOWNED_BIKE_VALUE },
          ]}
          placeholder="Select a bike"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location (optional)</Text>
        <TextInput
          style={styles.input}
          value={location}
          onChangeText={setLocation}
          placeholder="e.g., Tiger Mountain"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Add any notes about this ride..."
          multiline
          numberOfLines={4}
          maxLength={2000}
          textAlignVertical="top"
        />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={() => void handleSave()}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <Text style={styles.submitButtonText}>Save Ride</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelButton} onPress={handleDiscard}>
        <Text style={styles.cancelButtonText}>Discard</Text>
      </TouchableOpacity>
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
    paddingBottom: 40,
  },
  summaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 16,
    marginBottom: 20,
  },
  summaryStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  notesInput: {
    height: 100,
    paddingTop: 12,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    borderRadius: radius.full,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
});
