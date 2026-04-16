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
import { useDistanceUnit } from '../../hooks/useDistanceUnit';
import { colors } from '../../constants/theme';
import { conditionIcon, conditionLabel, conditionTint } from '../../lib/weather';
import type { WeatherCondition } from '../../lib/weather';

const WEATHER_ORDER: WeatherCondition[] = [
  'SUNNY',
  'CLOUDY',
  'RAINY',
  'SNOWY',
  'WINDY',
  'FOGGY',
  'UNKNOWN',
];

function buildTimeframeOptions(): { value: TimeframeOption; label: string }[] {
  const currentYear = new Date().getFullYear();
  const options: { value: TimeframeOption; label: string }[] = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: 'YTD', label: 'Year to date' },
  ];
  for (let i = 1; i <= 5; i++) {
    const year = currentYear - i;
    options.push({ value: `year:${year}`, label: `${year}` });
  }
  return options;
}

const TIMEFRAME_OPTIONS = buildTimeframeOptions();

type SectionKey = 'summary' | 'trends' | 'heartRate' | 'locations' | 'bikes' | 'weather';

export function RideStatsCard() {
  const { formatDistance, distanceUnit } = useDistanceUnit();
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
    if (value === null) return { text: '--', color: colors.textMuted };
    const sign = value >= 0 ? '+' : '';
    const color = value > 0 ? colors.good : value < 0 ? colors.danger : colors.textMuted;
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

  const hasAnyWeather = WEATHER_ORDER.some((k) => stats.weatherBreakdown[k] > 0);
  const weatherSection = !hasAnyWeather ? null : (
    <>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => toggleSection('weather')}
      >
        <View style={styles.sectionTitleRow}>
          <Ionicons name="partly-sunny-outline" size={18} color={colors.primary} />
          <Text style={styles.sectionTitle}>Weather</Text>
        </View>
        <Ionicons
          name={expandedSections.has('weather') ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textMuted}
        />
      </TouchableOpacity>
      {expandedSections.has('weather') && (
        <View style={styles.sectionContent}>
          <View style={styles.weatherGrid}>
            {WEATHER_ORDER.map((cond) => {
              const count = stats.weatherBreakdown[cond];
              if (count === 0) return null;
              return (
                <View key={cond} style={styles.weatherTile}>
                  <Ionicons
                    name={conditionIcon(cond)}
                    size={22}
                    color={cond === 'UNKNOWN' ? colors.textMuted : conditionTint(cond)}
                  />
                  <Text style={styles.weatherCount}>{count}</Text>
                  <Text style={styles.weatherLabel}>{conditionLabel(cond)}</Text>
                </View>
              );
            })}
          </View>
          {stats.weatherPendingCount > 0 && (
            <Text style={styles.weatherPendingText}>
              {stats.weatherPendingCount} ride
              {stats.weatherPendingCount === 1 ? '' : 's'} still pending weather fetch.
            </Text>
          )}
        </View>
      )}
    </>
  );

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
          <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {stats.truncated && (
        <Text style={styles.truncationNote}>
          Showing stats based on your most recent 500 rides. Weather totals cover your full history.
        </Text>
      )}

      {/* Summary Section */}
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => toggleSection('summary')}
      >
        <View style={styles.sectionTitleRow}>
          <Ionicons name="stats-chart-outline" size={18} color={colors.primary} />
          <Text style={styles.sectionTitle}>Summary</Text>
        </View>
        <Ionicons
          name={expandedSections.has('summary') ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textMuted}
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
              <Text style={styles.statValue}>{formatDistance(stats.totalDistance)}</Text>
              <Text style={styles.statLabel}>Distance</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatElevation(stats.totalElevation, distanceUnit)}</Text>
              <Text style={styles.statLabel}>Elevation</Text>
            </View>
          </View>
          <View style={styles.averagesRow}>
            <Text style={styles.avgText}>
              Avg: {formatDistance(stats.avgDistancePerRide)} / {stats.avgDurationMinutes} min / {distanceUnit === 'km' ? `${Math.round(stats.avgElevationPerRide)} m` : `${Math.round(stats.avgElevationPerRide * 3.28084)} ft`} per ride
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
          <Ionicons name="trending-up-outline" size={18} color={colors.primary} />
          <Text style={styles.sectionTitle}>Trends & Streaks</Text>
        </View>
        <Ionicons
          name={expandedSections.has('trends') ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textMuted}
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
                      ? formatDistance(record.value)
                      : record.type === 'most_elevation'
                      ? formatElevation(record.value, distanceUnit)
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
              <Ionicons name="heart-outline" size={18} color={colors.danger} />
              <Text style={styles.sectionTitle}>Heart Rate</Text>
            </View>
            <Ionicons
              name={expandedSections.has('heartRate') ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.textMuted}
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
              <Ionicons name="location-outline" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Top Locations</Text>
            </View>
            <Ionicons
              name={expandedSections.has('locations') ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.textMuted}
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
              <Ionicons name="bicycle-outline" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Bike Usage</Text>
            </View>
            <Ionicons
              name={expandedSections.has('bikes') ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.textMuted}
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

      {/* Weather Section */}
      {weatherSection}

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
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
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
    backgroundColor: colors.card,
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
    borderBottomColor: colors.cardBorder,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.background,
    borderRadius: 6,
  },
  dropdownText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  loadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  sectionContent: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
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
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  averagesRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  avgText: {
    fontSize: 12,
    color: colors.textSecondary,
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
    color: colors.textSecondary,
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
    backgroundColor: colors.background,
    padding: 10,
    borderRadius: 8,
  },
  streakValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  streakLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
  },
  recordsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  recordsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
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
    color: colors.textSecondary,
  },
  recordValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  hrRow: {
    flexDirection: 'row',
    gap: 16,
  },
  hrItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.dangerBg,
    padding: 12,
    borderRadius: 8,
  },
  hrValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.danger,
  },
  hrLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  hrNote: {
    fontSize: 11,
    color: colors.textMuted,
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
    color: colors.textMuted,
  },
  locationInfo: {
    flex: 1,
    marginRight: 8,
  },
  locationName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  locationStats: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  locationPercent: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
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
    color: colors.textPrimary,
    marginBottom: 4,
  },
  bikeBarContainer: {
    height: 6,
    backgroundColor: colors.cardBorder,
    borderRadius: 3,
    overflow: 'hidden',
  },
  bikeBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  bikeStats: {
    alignItems: 'flex-end',
  },
  bikeHours: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  bikePercent: {
    fontSize: 11,
    color: colors.textMuted,
  },
  weatherGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  weatherTile: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 10,
  },
  weatherCount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 4,
  },
  weatherLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  weatherPendingText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 8,
  },
  truncationNote: {
    fontSize: 11,
    color: colors.textMuted,
    paddingHorizontal: 16,
    paddingBottom: 8,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 8,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
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
    backgroundColor: colors.primaryMuted,
  },
  modalOptionText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  modalOptionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
});
