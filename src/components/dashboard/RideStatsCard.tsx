import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRideStats, TimeframeOption } from '../../hooks/useRideStats';
import { formatDuration, formatElevation } from '../../utils/greetingMessages';

const TIMEFRAME_OPTIONS: { value: TimeframeOption; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'YTD', label: 'Year to date' },
];

type SectionKey = 'summary' | 'trends' | 'heartRate' | 'locations' | 'bikes';

export function RideStatsCard() {
  const [timeframe, setTimeframe] = useState<TimeframeOption>('30d');
  const [showPicker, setShowPicker] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<SectionKey>>(
    new Set(['summary'])
  );
  const { stats, loading } = useRideStats(timeframe);

  const toggleSection = (section: SectionKey) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const currentLabel =
    TIMEFRAME_OPTIONS.find((o) => o.value === timeframe)?.label || 'Last 30 days';

  const formatHours = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const formatTrend = (value: number | null): { text: string; color: string } => {
    if (value === null) return { text: '--', color: '#9ca3af' };
    const sign = value >= 0 ? '+' : '';
    const color = value > 0 ? '#16a34a' : value < 0 ? '#dc2626' : '#9ca3af';
    return { text: `${sign}${value}%`, color };
  };

  if (loading && stats.totalRides === 0) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Ride Stats</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading stats...</Text>
        </View>
      </View>
    );
  }

  if (stats.totalRides === 0) {
    return null;
  }

  const distanceTrend = formatTrend(stats.weekOverWeekDistance);
  const ridesTrend = formatTrend(stats.weekOverWeekRides);

  return (
    <View style={styles.card}>
      {/* Header with dropdown */}
      <View style={styles.header}>
        <Text style={styles.title}>Ride Stats</Text>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setShowPicker(true)}
        >
          <Text style={styles.dropdownText}>{currentLabel}</Text>
          <Ionicons name="chevron-down" size={16} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Summary Section */}
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => toggleSection('summary')}
      >
        <View style={styles.sectionTitleRow}>
          <Ionicons name="stats-chart-outline" size={18} color="#2563eb" />
          <Text style={styles.sectionTitle}>Summary</Text>
        </View>
        <Ionicons
          name={expandedSections.has('summary') ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="#9ca3af"
        />
      </TouchableOpacity>
      {expandedSections.has('summary') && (
        <View style={styles.sectionContent}>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalRides}</Text>
              <Text style={styles.statLabel}>Rides</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatHours(stats.totalHours)}</Text>
              <Text style={styles.statLabel}>Time</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalDistance.toFixed(1)} mi</Text>
              <Text style={styles.statLabel}>Distance</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatElevation(stats.totalElevation)}</Text>
              <Text style={styles.statLabel}>Elevation</Text>
            </View>
          </View>
          <View style={styles.averagesRow}>
            <Text style={styles.avgText}>
              Avg: {stats.avgDistancePerRide} mi / {stats.avgDurationMinutes} min / {stats.avgElevationPerRide} ft per ride
            </Text>
          </View>
        </View>
      )}

      {/* Trends Section */}
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => toggleSection('trends')}
      >
        <View style={styles.sectionTitleRow}>
          <Ionicons name="trending-up-outline" size={18} color="#2563eb" />
          <Text style={styles.sectionTitle}>Trends & Streaks</Text>
        </View>
        <Ionicons
          name={expandedSections.has('trends') ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="#9ca3af"
        />
      </TouchableOpacity>
      {expandedSections.has('trends') && (
        <View style={styles.sectionContent}>
          <View style={styles.trendRow}>
            <Text style={styles.trendLabel}>Week over week (distance)</Text>
            <Text style={[styles.trendValue, { color: distanceTrend.color }]}>
              {distanceTrend.text}
            </Text>
          </View>
          <View style={styles.trendRow}>
            <Text style={styles.trendLabel}>Week over week (rides)</Text>
            <Text style={[styles.trendValue, { color: ridesTrend.color }]}>
              {ridesTrend.text}
            </Text>
          </View>
          <View style={styles.streakRow}>
            <View style={styles.streakItem}>
              <Ionicons name="flame-outline" size={16} color="#f97316" />
              <Text style={styles.streakValue}>{stats.currentStreak}</Text>
              <Text style={styles.streakLabel}>Current streak</Text>
            </View>
            <View style={styles.streakItem}>
              <Ionicons name="trophy-outline" size={16} color="#eab308" />
              <Text style={styles.streakValue}>{stats.longestStreak}</Text>
              <Text style={styles.streakLabel}>Longest streak</Text>
            </View>
          </View>
          {stats.personalRecords.length > 0 && (
            <View style={styles.recordsContainer}>
              <Text style={styles.recordsTitle}>Personal Records</Text>
              {stats.personalRecords.map((record) => (
                <View key={record.type} style={styles.recordRow}>
                  <Text style={styles.recordLabel}>
                    {record.type === 'longest_ride'
                      ? 'Longest ride'
                      : record.type === 'most_elevation'
                      ? 'Most climbing'
                      : 'Longest duration'}
                  </Text>
                  <Text style={styles.recordValue}>
                    {record.type === 'longest_ride'
                      ? `${record.value.toFixed(1)} mi`
                      : record.type === 'most_elevation'
                      ? formatElevation(record.value)
                      : formatDuration(record.value)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Heart Rate Section */}
      {stats.ridesWithHr > 0 && (
        <>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('heartRate')}
          >
            <View style={styles.sectionTitleRow}>
              <Ionicons name="heart-outline" size={18} color="#dc2626" />
              <Text style={styles.sectionTitle}>Heart Rate</Text>
            </View>
            <Ionicons
              name={expandedSections.has('heartRate') ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#9ca3af"
            />
          </TouchableOpacity>
          {expandedSections.has('heartRate') && (
            <View style={styles.sectionContent}>
              <View style={styles.hrRow}>
                <View style={styles.hrItem}>
                  <Text style={styles.hrValue}>{stats.averageHr} bpm</Text>
                  <Text style={styles.hrLabel}>Average HR</Text>
                </View>
                <View style={styles.hrItem}>
                  <Text style={styles.hrValue}>{stats.maxHr} bpm</Text>
                  <Text style={styles.hrLabel}>Peak avg HR</Text>
                </View>
              </View>
              <Text style={styles.hrNote}>
                {stats.ridesWithHr} of {stats.totalRides} rides have HR data
              </Text>
            </View>
          )}
        </>
      )}

      {/* Locations Section */}
      {stats.topLocations.length > 0 && (
        <>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('locations')}
          >
            <View style={styles.sectionTitleRow}>
              <Ionicons name="location-outline" size={18} color="#2563eb" />
              <Text style={styles.sectionTitle}>Top Locations</Text>
            </View>
            <Ionicons
              name={expandedSections.has('locations') ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#9ca3af"
            />
          </TouchableOpacity>
          {expandedSections.has('locations') && (
            <View style={styles.sectionContent}>
              {stats.topLocations.map((loc, index) => (
                <View key={loc.name} style={styles.locationRow}>
                  <Text style={styles.locationRank}>{index + 1}</Text>
                  <View style={styles.locationInfo}>
                    <Text style={styles.locationName} numberOfLines={1}>
                      {loc.name}
                    </Text>
                    <Text style={styles.locationStats}>
                      {loc.rideCount} rides · {loc.totalHours}h
                    </Text>
                  </View>
                  <Text style={styles.locationPercent}>{loc.percentage}%</Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {/* Bike Usage Section */}
      {stats.bikeTime.length > 0 && (
        <>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('bikes')}
          >
            <View style={styles.sectionTitleRow}>
              <Ionicons name="bicycle-outline" size={18} color="#2563eb" />
              <Text style={styles.sectionTitle}>Bike Usage</Text>
            </View>
            <Ionicons
              name={expandedSections.has('bikes') ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#9ca3af"
            />
          </TouchableOpacity>
          {expandedSections.has('bikes') && (
            <View style={styles.sectionContent}>
              {stats.bikeTime.map((bike) => (
                <View key={bike.name} style={styles.bikeRow}>
                  <View style={styles.bikeInfo}>
                    <Text style={styles.bikeName} numberOfLines={1}>
                      {bike.name}
                    </Text>
                    <View style={styles.bikeBarContainer}>
                      <View
                        style={[styles.bikeBar, { width: `${bike.percentage}%` }]}
                      />
                    </View>
                  </View>
                  <View style={styles.bikeStats}>
                    <Text style={styles.bikeHours}>{bike.hours}h</Text>
                    <Text style={styles.bikePercent}>{bike.percentage}%</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {/* Timeframe Picker Modal */}
      <Modal
        visible={showPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowPicker(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Timeframe</Text>
            {TIMEFRAME_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.modalOption,
                  timeframe === option.value && styles.modalOptionSelected,
                ]}
                onPress={() => {
                  setTimeframe(option.value);
                  setShowPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    timeframe === option.value && styles.modalOptionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
                {timeframe === option.value && (
                  <Ionicons name="checkmark" size={20} color="#2563eb" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1f2937',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
  },
  dropdownText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  loadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  sectionContent: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  averagesRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  avgText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trendLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  trendValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  streakRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 16,
  },
  streakItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f9fafb',
    padding: 10,
    borderRadius: 8,
  },
  streakValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  streakLabel: {
    fontSize: 11,
    color: '#6b7280',
    flex: 1,
  },
  recordsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  recordsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  recordLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  recordValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
  },
  hrRow: {
    flexDirection: 'row',
    gap: 16,
  },
  hrItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
  },
  hrValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#dc2626',
  },
  hrLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  hrNote: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  locationRank: {
    width: 20,
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
  },
  locationInfo: {
    flex: 1,
    marginRight: 8,
  },
  locationName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  locationStats: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 1,
  },
  locationPercent: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  bikeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bikeInfo: {
    flex: 1,
    marginRight: 12,
  },
  bikeName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  bikeBarContainer: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  bikeBar: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 3,
  },
  bikeStats: {
    alignItems: 'flex-end',
  },
  bikeHours: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  bikePercent: {
    fontSize: 11,
    color: '#9ca3af',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    marginBottom: 4,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalOptionSelected: {
    backgroundColor: '#eff6ff',
  },
  modalOptionText: {
    fontSize: 15,
    color: '#374151',
  },
  modalOptionTextSelected: {
    color: '#2563eb',
    fontWeight: '600',
  },
});
