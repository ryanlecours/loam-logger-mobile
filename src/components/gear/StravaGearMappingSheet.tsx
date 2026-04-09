import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useUnmappedStravaGearsQuery,
  useCreateStravaGearMappingMutation,
} from '../../graphql/generated';
import { colors } from '../../constants/theme';

interface StravaGearMappingSheetProps {
  visible: boolean;
  onClose: () => void;
  bikeId: string;
  bikeName: string;
  onMappingCreated?: () => void;
}

export function StravaGearMappingSheet({
  visible,
  onClose,
  bikeId,
  bikeName,
  onMappingCreated,
}: StravaGearMappingSheetProps) {
  const { data, loading: gearsLoading } = useUnmappedStravaGearsQuery({
    skip: !visible,
    fetchPolicy: 'network-only',
  });
  const [createMapping, { loading: creating }] = useCreateStravaGearMappingMutation({
    refetchQueries: ['UnmappedStravaGears', 'StravaGearMappings', 'GearLight'],
  });
  const [mappingGearId, setMappingGearId] = useState<string | null>(null);

  // Server already returns only unmapped gears
  const unmappedGears = data?.unmappedStravaGears ?? [];

  const handleMap = useCallback(async (gearId: string, gearName: string | null) => {
    setMappingGearId(gearId);
    try {
      await createMapping({
        variables: {
          input: {
            stravaGearId: gearId,
            stravaGearName: gearName,
            bikeId,
          },
        },
      });
      onMappingCreated?.();
      onClose();
    } catch {
      setMappingGearId(null);
      Alert.alert('Error', 'Failed to create mapping.');
    }
  }, [bikeId, createMapping, onMappingCreated, onClose]);

  const handleClose = useCallback(() => {
    setMappingGearId(null);
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              <View style={styles.handle} />

              <View style={styles.header}>
                <Text style={styles.title}>Link Strava Bike</Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.subtitle}>
                Map a Strava bike to {bikeName} to auto-assign rides
              </Text>

              <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                {gearsLoading ? (
                  <View style={styles.emptyState}>
                    <ActivityIndicator size="large" color={colors.primary} />
                  </View>
                ) : unmappedGears.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="checkmark-circle" size={48} color={colors.good} />
                    <Text style={styles.emptyText}>All Strava bikes are mapped</Text>
                  </View>
                ) : (
                  unmappedGears.map((gear) => {
                    const isMapping = mappingGearId === gear.gearId;
                    return (
                      <TouchableOpacity
                        key={gear.gearId}
                        style={styles.gearItem}
                        onPress={() => handleMap(gear.gearId, gear.gearName ?? null)}
                        disabled={creating}
                        activeOpacity={0.7}
                      >
                        <View style={styles.gearInfo}>
                          <Text style={styles.gearName}>
                            {gear.gearName || gear.gearId}
                          </Text>
                          <Text style={styles.gearRides}>
                            {gear.rideCount} {gear.rideCount === 1 ? 'ride' : 'rides'}
                          </Text>
                        </View>
                        {isMapping ? (
                          <ActivityIndicator size="small" color={colors.strava} />
                        ) : (
                          <Ionicons name="link-outline" size={20} color={colors.strava} />
                        )}
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>

              <View style={styles.footer}>
                <TouchableOpacity style={styles.skipButton} onPress={handleClose}>
                  <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
    paddingBottom: 34,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.cardBorder,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  list: {
    maxHeight: 250,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
  },
  gearItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  gearInfo: {
    flex: 1,
  },
  gearName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  gearRides: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  footer: {
    padding: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipText: {
    fontSize: 16,
    color: colors.textMuted,
  },
});
