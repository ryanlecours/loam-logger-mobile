import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useStravaGearMappingsQuery,
  useUnmappedStravaGearsQuery,
  useGearLightQuery,
  useCreateStravaGearMappingMutation,
  useDeleteStravaGearMappingMutation,
} from '../../src/graphql/generated';
import { colors } from '../../src/constants/theme';

export default function StravaMappingsScreen() {
  const { data: mappingsData, loading: mappingsLoading } = useStravaGearMappingsQuery({
    fetchPolicy: 'cache-and-network',
  });
  const { data: unmappedData, loading: unmappedLoading } = useUnmappedStravaGearsQuery({
    fetchPolicy: 'cache-and-network',
  });
  const { data: gearData } = useGearLightQuery({ fetchPolicy: 'cache-first' });

  const [createMapping, { loading: creating }] = useCreateStravaGearMappingMutation({
    refetchQueries: ['UnmappedStravaGears', 'StravaGearMappings', 'GearLight'],
  });
  const [deleteMapping] = useDeleteStravaGearMappingMutation({
    refetchQueries: ['UnmappedStravaGears', 'StravaGearMappings', 'GearLight'],
  });

  const [expandedGearId, setExpandedGearId] = useState<string | null>(null);
  const [mappingGearId, setMappingGearId] = useState<string | null>(null);

  const mappings = mappingsData?.stravaGearMappings ?? [];
  const unmappedGears = unmappedData?.unmappedStravaGears?.filter(g => !g.isMapped) ?? [];
  const bikes = gearData?.bikes ?? [];

  // Exclude bikes that already have a mapping
  const mappedBikeIds = new Set(mappings.map(m => m.bikeId));
  const availableBikes = bikes.filter(b => !mappedBikeIds.has(b.id));

  const handleDelete = useCallback((id: string, gearName: string | null) => {
    Alert.alert(
      'Remove Mapping',
      `Remove the mapping for ${gearName || 'this Strava bike'}? Rides will be unassigned from the linked bike.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMapping({ variables: { id } });
            } catch {
              Alert.alert('Error', 'Failed to remove mapping.');
            }
          },
        },
      ]
    );
  }, [deleteMapping]);

  const handleMap = useCallback(async (gearId: string, gearName: string | null, bikeId: string) => {
    setMappingGearId(gearId);
    try {
      await createMapping({
        variables: {
          input: { stravaGearId: gearId, stravaGearName: gearName, bikeId },
        },
      });
      setExpandedGearId(null);
    } catch {
      Alert.alert('Error', 'Failed to create mapping.');
    } finally {
      setMappingGearId(null);
    }
  }, [createMapping]);

  const loading = mappingsLoading || unmappedLoading;

  const getBikeName = (bike: { nickname?: string | null; manufacturer: string; model: string }) =>
    bike.nickname || `${bike.manufacturer} ${bike.model}`;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Strava Bike Mapping' }} />
      <ScrollView contentContainerStyle={styles.content}>
        {loading && mappings.length === 0 && unmappedGears.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {/* Current Mappings */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Current Mappings</Text>
              {mappings.length === 0 ? (
                <Text style={styles.emptyText}>No Strava bikes mapped yet</Text>
              ) : (
                mappings.map((mapping) => (
                  <View key={mapping.id} style={styles.mappingRow}>
                    <View style={styles.mappingInfo}>
                      <Text style={styles.gearName}>
                        {mapping.stravaGearName || mapping.stravaGearId}
                      </Text>
                      <View style={styles.arrowRow}>
                        <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />
                        <Text style={styles.bikeName}>
                          {mapping.bike ? getBikeName(mapping.bike) : 'Unknown bike'}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDelete(mapping.id, mapping.stravaGearName ?? null)}
                      style={styles.deleteButton}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>

            {/* Unmapped Gears */}
            {unmappedGears.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Unmapped Strava Bikes</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unmappedGears.length}</Text>
                  </View>
                </View>
                {unmappedGears.map((gear) => {
                  const isExpanded = expandedGearId === gear.gearId;
                  const isMapping = mappingGearId === gear.gearId;

                  return (
                    <View key={gear.gearId}>
                      <TouchableOpacity
                        style={styles.unmappedRow}
                        onPress={() => setExpandedGearId(isExpanded ? null : gear.gearId)}
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
                          <Ionicons
                            name={isExpanded ? 'chevron-up' : 'link-outline'}
                            size={18}
                            color={isExpanded ? colors.textSecondary : colors.strava}
                          />
                        )}
                      </TouchableOpacity>

                      {isExpanded && (
                        <View style={styles.bikePickerContainer}>
                          <Text style={styles.bikePickerLabel}>Select a bike to map to:</Text>
                          {availableBikes.length === 0 ? (
                            <Text style={styles.noBikesText}>No available bikes. Create one first.</Text>
                          ) : (
                            availableBikes.map((bike) => (
                              <TouchableOpacity
                                key={bike.id}
                                style={styles.bikeOption}
                                onPress={() => handleMap(gear.gearId, gear.gearName ?? null, bike.id)}
                                disabled={creating}
                                activeOpacity={0.7}
                              >
                                <Ionicons name="bicycle" size={16} color={colors.primary} />
                                <Text style={styles.bikeOptionText}>{getBikeName(bike)}</Text>
                              </TouchableOpacity>
                            ))
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* All mapped */}
            {mappings.length > 0 && unmappedGears.length === 0 && (
              <View style={styles.allMappedContainer}>
                <Ionicons name="checkmark-circle" size={48} color={colors.good} />
                <Text style={styles.allMappedText}>All Strava bikes are mapped!</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
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
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  badge: {
    backgroundColor: colors.strava,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 12,
  },
  mappingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  mappingInfo: {
    flex: 1,
  },
  arrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  bikeName: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 8,
  },
  unmappedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
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
  bikePickerContainer: {
    paddingVertical: 8,
    paddingLeft: 16,
    backgroundColor: colors.surface,
    borderRadius: 8,
    marginBottom: 8,
  },
  bikePickerLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  noBikesText: {
    fontSize: 13,
    color: colors.textMuted,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  bikeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  bikeOptionText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  allMappedContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  allMappedText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 12,
  },
});
