import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { useDistanceUnit } from '../../src/hooks/useDistanceUnit';
import { useAddRideMutation, type AddRideInput } from '../../src/graphql/generated';
import { submitRideResilient } from '../../src/lib/submitRide';
import { useBikesWithPredictions } from '../../src/hooks/useBikesWithPredictions';
import { PickerSelect } from '../../src/components/common/PickerSelect';
import { UNOWNED_BIKE_VALUE } from '../../src/constants/rideBike';
import { colors, radius } from '../../src/constants/theme';
import { KeyboardDoneAccessory } from '../../src/components/common/KeyboardDoneAccessory';

/** Unique per surface: other screens stay mounted underneath and would collide on a shared id. */
const DONE_ACCESSORY = 'add-ride-done';

const RIDE_TYPES = [
  { value: 'TRAIL', label: 'Trail' },
  { value: 'ENDURO', label: 'Enduro' },
  { value: 'XC', label: 'Cross Country' },
  { value: 'DOWNHILL', label: 'Downhill' },
  { value: 'GRAVEL', label: 'Gravel' },
  { value: 'ROAD', label: 'Road' },
  { value: 'COMMUTE', label: 'Commute' },
  { value: 'TRAINER', label: 'Trainer' },
];

export default function AddRideScreen() {
  const router = useRouter();
  const { bikes } = useBikesWithPredictions();
  const [addRide, { loading }] = useAddRideMutation();
  const { distanceUnit, toMeters } = useDistanceUnit();

  // Form state
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [distance, setDistance] = useState('');
  const [elevation, setElevation] = useState('');
  const [rideType, setRideType] = useState('TRAIL');
  const [bikeId, setBikeId] = useState(bikes[0]?.id || '');
  const [averageHr, setAverageHr] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const handleDateChange = (_event: unknown, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(date);
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setDate(newDate);
    }
  };

  const handleTimeChange = (_event: unknown, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(date);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setDate(newDate);
    }
  };

  const validateForm = (): boolean => {
    const durationSeconds =
      (parseInt(hours || '0', 10) * 3600) + (parseInt(minutes || '0', 10) * 60);

    if (durationSeconds <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid duration');
      return false;
    }

    const distanceNum = parseFloat(distance);
    if (isNaN(distanceNum) || distanceNum <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid distance');
      return false;
    }

    const elevationNum = parseFloat(elevation);
    if (isNaN(elevationNum) || elevationNum < 0) {
      Alert.alert('Validation Error', 'Please enter a valid elevation');
      return false;
    }

    if (!bikeId && bikes.length > 0) {
      Alert.alert('Validation Error', 'Please select a bike');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const durationSeconds =
      (parseInt(hours || '0', 10) * 3600) + (parseInt(minutes || '0', 10) * 60);

    const unownedBike = bikeId === UNOWNED_BIKE_VALUE;

    // Generated on every submit, online or not: if the response gets lost in
    // transit and this exact ride is retried, the server recognizes the key
    // and returns the original instead of logging the ride twice.
    const clientMutationId = Crypto.randomUUID();

    const input: AddRideInput = {
      startTime: date.toISOString(),
      durationSeconds,
      distanceMeters: toMeters(parseFloat(distance)),
      elevationGainMeters: distanceUnit === 'km' ? parseFloat(elevation) : parseFloat(elevation) * 0.3048,
      rideType,
      // Never send both: the server rejects a bikeId alongside
      // unownedBike: true rather than silently picking one.
      bikeId: unownedBike ? null : bikeId || null,
      unownedBike,
      averageHr: averageHr ? parseInt(averageHr, 10) : null,
      location: location || null,
      notes: notes || null,
      clientMutationId,
    };

    try {
      const outcome = await submitRideResilient(input, () =>
        addRide({
          variables: { input },
          refetchQueries: ['RidesPage', 'RecentRides', 'UnassignedRideCount'],
        }),
      );
      if (outcome === 'queued') {
        Alert.alert(
          'Ride saved on this phone',
          "No connection right now. Your ride will upload automatically once you're back in signal.",
        );
      }
      router.back();
    } catch (_error) {
      // Only a deterministic rejection (validation, bad input) reaches here;
      // transient failures were queued by submitRideResilient.
      Alert.alert('Error', 'Failed to add ride. Please try again.');
    }
  };

  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        // The keyboard covers the lower half of this form. On iOS this pads the
        // scroll insets and brings the focused field into view; Android's
        // adjustResize already shrinks the window, so it is a no-op there.
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* Date & Time */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date & Time</Text>
          <View style={styles.dateTimeRow}>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
              <Text style={styles.dateButtonText}>{formattedDate}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Ionicons name="time-outline" size={18} color={colors.textMuted} />
              <Text style={styles.dateButtonText}>{formattedTime}</Text>
            </TouchableOpacity>
          </View>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}
          {showTimePicker && (
            <DateTimePicker
              value={date}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeChange}
            />
          )}
        </View>

        {/* Duration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Duration</Text>
          <View style={styles.durationRow}>
            <View style={styles.durationInput}>
              <TextInput
                inputAccessoryViewID={DONE_ACCESSORY}
                style={styles.input}
                value={hours}
                onChangeText={setHours}
                placeholder="0"
                keyboardType="number-pad"
                maxLength={2}
              />
              <Text style={styles.durationLabel}>hours</Text>
            </View>
            <View style={styles.durationInput}>
              <TextInput
                inputAccessoryViewID={DONE_ACCESSORY}
                style={styles.input}
                value={minutes}
                onChangeText={setMinutes}
                placeholder="0"
                keyboardType="number-pad"
                maxLength={2}
              />
              <Text style={styles.durationLabel}>minutes</Text>
            </View>
          </View>
        </View>

        {/* Distance & Elevation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Distance & Elevation</Text>
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <TextInput
                inputAccessoryViewID={DONE_ACCESSORY}
                style={styles.input}
                value={distance}
                onChangeText={setDistance}
                placeholder="0.0"
                keyboardType="decimal-pad"
              />
              <Text style={styles.inputSuffix}>{distanceUnit === 'km' ? 'km' : 'mi'}</Text>
            </View>
            <View style={styles.halfInput}>
              <TextInput
                inputAccessoryViewID={DONE_ACCESSORY}
                style={styles.input}
                value={elevation}
                onChangeText={setElevation}
                placeholder="0"
                keyboardType="number-pad"
              />
              <Text style={styles.inputSuffix}>{distanceUnit === 'km' ? 'meters' : 'feet'}</Text>
            </View>
          </View>
        </View>

        {/* Ride Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ride Type</Text>
          <PickerSelect
            selectedValue={rideType}
            onValueChange={setRideType}
            options={RIDE_TYPES}
          />
        </View>

        {/* Bike. Rendered even with no bikes on the account: "Not my bike" is a
            valid answer for a rider logging a demo or rental. */}
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

        {/* Optional: Average HR */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Average Heart Rate (optional)</Text>
          <View style={styles.inputWithSuffix}>
            <TextInput
              inputAccessoryViewID={DONE_ACCESSORY}
              style={styles.input}
              value={averageHr}
              onChangeText={setAverageHr}
              placeholder="0"
              keyboardType="number-pad"
              maxLength={3}
            />
            <Text style={styles.inputSuffix}>bpm</Text>
          </View>
        </View>

        {/* Optional: Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location (optional)</Text>
          <TextInput
            inputAccessoryViewID={DONE_ACCESSORY}
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="e.g., Tiger Mountain"
          />
        </View>

        {/* Optional: Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes (optional)</Text>
          <TextInput
            inputAccessoryViewID={DONE_ACCESSORY}
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any notes about this ride..."
            multiline
            numberOfLines={4}
            maxLength={2000}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{notes.length}/2000</Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.submitButtonText}>Add Ride</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>

      <KeyboardDoneAccessory nativeID={DONE_ACCESSORY} />
    </>
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
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  timeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  dateButtonText: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 12,
  },
  durationInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  durationLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  inputWithSuffix: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputSuffix: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  notesInput: {
    height: 100,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 4,
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
    alignItems: 'center' as const,
    marginTop: 12,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
});
