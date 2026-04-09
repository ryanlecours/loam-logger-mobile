import { useState, useCallback } from 'react';
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { useGearQuery, useUpdateBikeNotificationPreferenceMutation, ServiceNotificationMode } from '../../src/graphql/generated';
import { colors } from '../../src/constants/theme';

const MODES: { value: ServiceNotificationMode; label: string }[] = [
  { value: ServiceNotificationMode.RidesBefore, label: 'Rides' },
  { value: ServiceNotificationMode.HoursBefore, label: 'Hours' },
  { value: ServiceNotificationMode.AtService, label: 'At service' },
];

function BikeNotificationCard({
  bike,
}: {
  bike: {
    id: string;
    nickname?: string | null;
    manufacturer: string;
    model: string;
    notificationPreference?: {
      bikeId: string;
      serviceNotificationsEnabled: boolean;
      serviceNotificationMode: ServiceNotificationMode;
      serviceNotificationThreshold: number;
    } | null;
  };
}) {
  const [updatePref] = useUpdateBikeNotificationPreferenceMutation();

  const pref = bike.notificationPreference;
  const serverEnabled = pref?.serviceNotificationsEnabled ?? true;
  const serverMode = pref?.serviceNotificationMode ?? ServiceNotificationMode.RidesBefore;
  const serverThreshold = pref?.serviceNotificationThreshold ?? 3;

  const [localEnabled, setLocalEnabled] = useState<boolean | null>(null);
  const [localMode, setLocalMode] = useState<ServiceNotificationMode | null>(null);
  const [localThreshold, setLocalThreshold] = useState(String(serverThreshold));
  const [saving, setSaving] = useState(false);

  // Use local state for immediate UI feedback, fall back to server state
  const enabled = localEnabled ?? serverEnabled;
  const mode = localMode ?? serverMode;
  const threshold = serverThreshold;

  const bikeName = bike.nickname || `${bike.manufacturer} ${bike.model}`;

  const update = useCallback(
    async (input: {
      serviceNotificationsEnabled?: boolean;
      serviceNotificationMode?: ServiceNotificationMode;
      serviceNotificationThreshold?: number;
    }) => {
      setSaving(true);
      try {
        await updatePref({
          variables: {
            input: {
              bikeId: bike.id,
              ...input,
            },
          },
          refetchQueries: ['Gear'],
        });
      } catch {
        Alert.alert('Error', 'Failed to update notification preferences.');
      } finally {
        setSaving(false);
      }
    },
    [updatePref, bike.id]
  );

  const handleToggle = (value: boolean) => {
    setLocalEnabled(value);
    update({ serviceNotificationsEnabled: value });
  };

  const handleModeChange = (newMode: ServiceNotificationMode) => {
    setLocalMode(newMode);
    update({ serviceNotificationMode: newMode });
  };

  const handleThresholdBlur = () => {
    const parsed = parseInt(localThreshold, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 100 && parsed !== threshold) {
      update({ serviceNotificationThreshold: parsed });
    } else {
      setLocalThreshold(String(threshold));
    }
  };

  const showThreshold = mode !== ServiceNotificationMode.AtService;
  const thresholdUnit = mode === ServiceNotificationMode.RidesBefore ? 'rides' : 'hours';

  return (
    <View style={styles.bikeCard}>
      <View style={styles.bikeHeader}>
        <Text style={styles.bikeName}>{bikeName}</Text>
        {saving && <ActivityIndicator size="small" color={colors.primary} />}
        <Switch
          value={enabled}
          onValueChange={handleToggle}
          trackColor={{ false: colors.cardBorder, true: colors.primary }}
          thumbColor="#fff"
        />
      </View>

      {enabled && (
        <>
          <Text style={styles.fieldLabel}>Reminder Timing</Text>
          <View style={styles.segmentedControl}>
            {MODES.map((m) => (
              <TouchableOpacity
                key={m.value}
                style={[styles.segment, mode === m.value && styles.segmentActive]}
                onPress={() => handleModeChange(m.value)}
              >
                <Text
                  style={[
                    styles.segmentText,
                    mode === m.value && styles.segmentTextActive,
                  ]}
                >
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {showThreshold && (
            <View style={styles.thresholdRow}>
              <Text style={styles.fieldLabel}>
                Notify me at
              </Text>
              <View style={styles.thresholdInputGroup}>
                <TextInput
                  style={styles.thresholdInput}
                  value={localThreshold}
                  onChangeText={setLocalThreshold}
                  onBlur={handleThresholdBlur}
                  keyboardType="number-pad"
                  maxLength={3}
                  selectTextOnFocus
                />
                <Text style={styles.thresholdUnit}>{thresholdUnit} before service</Text>
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}

export default function ServiceNotificationsScreen() {
  const { data, loading } = useGearQuery();

  const bikes = data?.bikes?.filter((b) => b.status === 'ACTIVE') ?? [];

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Service Reminders',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
        }}
      />
      <ScrollView style={styles.container}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : bikes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No active bikes found</Text>
          </View>
        ) : (
          bikes.map((bike) => (
            <BikeNotificationCard key={bike.id} bike={bike} />
          ))
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 16,
  },
  bikeCard: {
    backgroundColor: colors.card,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.cardBorder,
  },
  bikeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bikeName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  fieldLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
    marginBottom: 8,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  segmentTextActive: {
    color: colors.textPrimary,
  },
  thresholdRow: {
    marginTop: 4,
  },
  thresholdInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  thresholdInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    width: 56,
    textAlign: 'center',
  },
  thresholdUnit: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
