import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRideStats, type TimeframeOption } from '../src/hooks/useRideStats';
import { useDistanceUnit } from '../src/hooks/useDistanceUnit';
import { formatDuration, formatElevation } from '../src/utils/greetingMessages';
import { ErrorState } from '../src/components/common/ErrorState';
import { describeError } from '../src/utils/errorCopy';
import { colors, radius, space, type } from '../src/constants/theme';
import { conditionIcon, conditionLabel, conditionTint } from '../src/lib/weather';
import type { WeatherCondition } from '../src/lib/weather';

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
    { value: '7d', label: '7D' },
    { value: '30d', label: '30D' },
    { value: '90d', label: '90D' },
    { value: 'YTD', label: 'YTD' },
  ];
  for (let i = 1; i <= 5; i++) {
    options.push({ value: `year:${currentYear - i}`, label: `${currentYear - i}` });
  }
  return options;
}

const TIMEFRAME_OPTIONS = buildTimeframeOptions();

/**
 * Riding insights: streaks, records, heart rate, locations and weather.
 *
 * These lived at the bottom of the dashboard, which made a gear-health screen
 * end in a weather breakdown. They are real features and riders like them, but
 * they answer "how have I been riding", not "what does my bike need", so they
 * get their own screen off the Rides tab instead of a home on the dashboard.
 *
 * The sections render open rather than as an accordion. On a screen whose only
 * job is this, six collapsed headers is a decision the rider should not have to
 * make, and the old accordion was one of two places on the dashboard offering
 * more than four choices at once.
 */
export default function RideInsightsScreen() {
  const insets = useSafeAreaInsets();
  const { formatDistance, distanceUnit } = useDistanceUnit();
  const [timeframe, setTimeframe] = useState<TimeframeOption>('30d');
  const { stats, loading, error, refetch } = useRideStats(timeframe);

  const trend = (value: number | null): { text: string; color: string } => {
    if (value === null) return { text: '--', color: colors.textMuted };
    const sign = value >= 0 ? '+' : '';
    return {
      text: `${sign}${value}%`,
      color: value > 0 ? colors.positiveOn : colors.textSecondary,
    };
  };

  const distanceTrend = trend(stats.weekOverWeekDistance);
  const ridesTrend = trend(stats.weekOverWeekRides);
  const hasWeather = WEATHER_ORDER.some((k) => stats.weatherBreakdown[k] > 0);

  return (
    <>
      <Stack.Screen options={{ title: 'Riding Insights' }} />
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.section }]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.timeframeRow}
          >
            {TIMEFRAME_OPTIONS.map(({ value, label }) => {
              const active = value === timeframe;
              return (
                <TouchableOpacity
                  key={value}
                  style={[styles.timeframePill, active && styles.timeframePillActive]}
                  onPress={() => setTimeframe(value)}
                  accessibilityRole="tab"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.timeframeText, active && styles.timeframeTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {error && stats.totalRides === 0 ? (
            <ErrorState
              variant="card"
              {...describeError(error, 'riding insights')}
              onRetry={() => refetch()}
            />
          ) : loading && stats.totalRides === 0 ? (
            <Text style={styles.muted}>Loading your riding history...</Text>
          ) : stats.totalRides === 0 ? (
            <Text style={styles.muted}>No rides in this timeframe yet.</Text>
          ) : (
            <>
              <Section icon="trending-up-outline" title="Trends and streaks">
                <Row label="Week over week (distance)">
                  <Text style={[styles.rowValue, { color: distanceTrend.color }]}>
                    {distanceTrend.text}
                  </Text>
                </Row>
                <Row label="Week over week (rides)">
                  <Text style={[styles.rowValue, { color: ridesTrend.color }]}>
                    {ridesTrend.text}
                  </Text>
                </Row>
                <View style={styles.streakRow}>
                  <View style={styles.streakItem}>
                    <Ionicons name="flame-outline" size={16} color={colors.accentWarm} />
                    <Text style={styles.streakValue}>{stats.currentStreak}</Text>
                    <Text style={styles.streakLabel}>Current streak</Text>
                  </View>
                  <View style={styles.streakItem}>
                    <Ionicons name="trophy-outline" size={16} color={colors.accentPearl} />
                    <Text style={styles.streakValue}>{stats.longestStreak}</Text>
                    <Text style={styles.streakLabel}>Longest streak</Text>
                  </View>
                </View>
                {stats.personalRecords.map((record) => (
                  <Row
                    key={record.type}
                    label={
                      record.type === 'longest_ride'
                        ? 'Longest ride'
                        : record.type === 'most_elevation'
                          ? 'Most climbing'
                          : 'Longest duration'
                    }
                  >
                    <Text style={styles.rowValue}>
                      {record.type === 'longest_ride'
                        ? formatDistance(record.value)
                        : record.type === 'most_elevation'
                          ? formatElevation(record.value, distanceUnit)
                          : formatDuration(record.value)}
                    </Text>
                  </Row>
                ))}
              </Section>

              {stats.ridesWithHr > 0 && (
                <Section icon="heart-outline" title="Heart rate">
                  <Row label="Average">
                    <Text style={styles.rowValue}>
                      {stats.averageHr ? `${stats.averageHr} bpm` : '--'}
                    </Text>
                  </Row>
                  <Row label="Max">
                    <Text style={styles.rowValue}>
                      {stats.maxHr ? `${stats.maxHr} bpm` : '--'}
                    </Text>
                  </Row>
                  <Text style={styles.note}>
                    From {stats.ridesWithHr} ride{stats.ridesWithHr === 1 ? '' : 's'} with heart-rate
                    data.
                  </Text>
                </Section>
              )}

              {stats.topLocations.length > 0 && (
                <Section icon="location-outline" title="Top locations">
                  {stats.topLocations.map((loc, index) => (
                    <View key={loc.name} style={styles.locationRow}>
                      <Text style={styles.locationRank}>{index + 1}</Text>
                      <View style={styles.locationInfo}>
                        <Text style={styles.locationName} numberOfLines={1}>
                          {loc.name}
                        </Text>
                        <Text style={styles.note}>
                          {loc.rideCount} rides · {loc.totalHours}h
                        </Text>
                      </View>
                      <Text style={styles.rowValue}>{loc.percentage}%</Text>
                    </View>
                  ))}
                </Section>
              )}

              {hasWeather && (
                <Section icon="partly-sunny-outline" title="Weather">
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
                          <Text style={styles.streakValue}>{count}</Text>
                          <Text style={styles.streakLabel}>{conditionLabel(cond)}</Text>
                        </View>
                      );
                    })}
                  </View>
                  {stats.weatherPendingCount > 0 && (
                    <Text style={styles.note}>
                      {stats.weatherPendingCount} ride
                      {stats.weatherPendingCount === 1 ? '' : 's'} still pending weather.
                    </Text>
                  )}
                </Section>
              )}

              {stats.truncated && (
                <Text style={styles.note}>
                  Based on your most recent 500 rides. Weather covers the full timeframe.
                </Text>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={18} color={colors.primary} accessibilityElementsHidden />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: space.xl,
    gap: space.xl,
  },
  timeframeRow: {
    gap: space.md,
    paddingRight: space.xl,
  },
  timeframePill: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: space.xl,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  timeframePillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timeframeText: {
    ...type.captionStrong,
    color: colors.textSecondary,
  },
  timeframeTextActive: {
    color: colors.onPrimary,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: space.xl,
    gap: space.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  sectionTitle: {
    ...type.eyebrow,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.lg,
  },
  rowLabel: {
    flex: 1,
    ...type.footnote,
    color: colors.textSecondary,
  },
  rowValue: {
    ...type.footnoteStrong,
    color: colors.textPrimary,
  },
  streakRow: {
    flexDirection: 'row',
    gap: space.xl,
  },
  streakItem: {
    flex: 1,
    alignItems: 'center',
    gap: space.xs,
    paddingVertical: space.lg,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
  },
  streakValue: {
    ...type.title,
    color: colors.textPrimary,
  },
  streakLabel: {
    ...type.labelSmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
  },
  locationRank: {
    minWidth: 20,
    ...type.label,
    color: colors.textMuted,
  },
  locationInfo: {
    flex: 1,
    minWidth: 0,
  },
  locationName: {
    ...type.footnote,
    color: colors.textPrimary,
  },
  weatherGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.lg,
  },
  weatherTile: {
    minWidth: 72,
    flexGrow: 1,
    alignItems: 'center',
    gap: space.xs,
    paddingVertical: space.lg,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
  },
  note: {
    ...type.label,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 17,
    color: colors.textMuted,
  },
  muted: {
    ...type.footnote,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: space.section,
  },
});
