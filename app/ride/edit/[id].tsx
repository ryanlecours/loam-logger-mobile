import { useState, useEffect } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import {
  useRidesPageQuery,
  useUpdateRideMutation,
} from '../../../src/graphql/generated';
import { useBikesWithPredictions } from '../../../src/hooks/useBikesWithPredictions';

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

export default function EditRideScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { bikes } = useBikesWithPredictions();
  const [updateRide, { loading: updating }] = useUpdateRideMutation();

  // Fetch ride from cache
  const { data, loading } = useRidesPageQuery({
    variables: { take: 100 },
    fetchPolicy: 'cache-first',
  });

  const ride = data?.rides.find((r) => r.id === id);

  // Form state
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [distance, setDistance] = useState('');
  const [elevation, setElevation] = useState('');
  const [rideType, setRideType] = useState('TRAIL');
  const [bikeId, setBikeId] = useState('');
  const [averageHr, setAverageHr] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [initialized, setInitialized] = useState(false);

  // Initialize form with ride data
  useEffect(() => {
    if (ride && !initialized) {
      const startDate = new Date(ride.startTime);
      setDate(startDate);

      const totalMinutes = Math.floor(ride.durationSeconds / 60);
      setHours(String(Math.floor(totalMinutes / 60)));
      setMinutes(String(totalMinutes % 60));

      setDistance(String(ride.distanceMiles));
      setElevation(String(ride.elevationGainFeet));
      setRideType(ride.rideType);
      setBikeId(ride.bikeId || '');
      setAverageHr(ride.averageHr ? String(ride.averageHr) : '');
      setLocation(ride.location || '');
      setNotes(ride.notes || '');
      setInitialized(true);
    }
  }, [ride, initialized]);

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
      parseInt(hours || '0', 10) * 3600 + parseInt(minutes || '0', 10) * 60;

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

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const durationSeconds =
      parseInt(hours || '0', 10) * 3600 + parseInt(minutes || '0', 10) * 60;

    try {
      await updateRide({
        variables: {
          id: id!,
          input: {
            startTime: date.toISOString(),
            durationSeconds,
            distanceMiles: parseFloat(distance),
            elevationGainFeet: parseFloat(elevation),
            rideType,
            bikeId: bikeId || null,
            averageHr: averageHr ? parseInt(averageHr, 10) : null,
            location: location || null,
            notes: notes || null,
          },
        },
        refetchQueries: ['RidesPage', 'RecentRides'],
      });
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to update ride. Please try again.');
    }
  };

  if (loading || !initialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2d5016" />
      </View>
    );
  }

  if (!ride) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#9ca3af" />
        <Text style={styles.errorText}>Ride not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Date & Time */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Date & Time</Text>
        <View style={styles.dateTimeRow}>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={18} color="#6b7280" />
            <Text style={styles.dateButtonText}>{formattedDate}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.timeButton}
            onPress={() => setShowTimePicker(true)}
          >
            <Ionicons name="time-outline" size={18} color="#6b7280" />
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
              style={styles.input}
              value={distance}
              onChangeText={setDistance}
              placeholder="0.0"
              keyboardType="decimal-pad"
            />
            <Text style={styles.inputSuffix}>miles</Text>
          </View>
          <View style={styles.halfInput}>
            <TextInput
              style={styles.input}
              value={elevation}
              onChangeText={setElevation}
              placeholder="0"
              keyboardType="number-pad"
            />
            <Text style={styles.inputSuffix}>feet</Text>
          </View>
        </View>
      </View>

      {/* Ride Type */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ride Type</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={rideType}
            onValueChange={setRideType}
            style={styles.picker}
          >
            {RIDE_TYPES.map((type) => (
              <Picker.Item key={type.value} label={type.label} value={type.value} />
            ))}
          </Picker>
        </View>
      </View>

      {/* Bike */}
      {bikes.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bike</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={bikeId}
              onValueChange={setBikeId}
              style={styles.picker}
            >
              <Picker.Item label="No bike selected" value="" />
              {bikes.map((bike) => (
                <Picker.Item
                  key={bike.id}
                  label={bike.nickname || `${bike.manufacturer} ${bike.model}`}
                  value={bike.id}
                />
              ))}
            </Picker>
          </View>
        </View>
      )}

      {/* Optional: Average HR */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Average Heart Rate (optional)</Text>
        <View style={styles.inputWithSuffix}>
          <TextInput
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
        style={[styles.submitButton, updating && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={updating}
      >
        {updating ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Save Changes</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
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
    color: '#6b7280',
    marginTop: 12,
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#2d5016',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
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
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  timeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dateButtonText: {
    fontSize: 15,
    color: '#1f2937',
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
    color: '#6b7280',
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
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  inputWithSuffix: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputSuffix: {
    fontSize: 14,
    color: '#6b7280',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  notesInput: {
    height: 100,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#2d5016',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
