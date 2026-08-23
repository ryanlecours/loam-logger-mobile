import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
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
 * Riding insights: totals, streaks, records, heart rate, bikes, locations and
 * weather.
 *
 * Most of these lived at the bottom of the dashboard, which made a gear-health
 * screen end in a weather breakdown. They are real features and riders like
 * them, but they answer "how have I been riding", not "what does my bike
 * need", so they get their own screen off the Rides tab instead of a home on
 * the dashboard.
 *
 * Totals and hours-per-bike appear here AND on the dashboard, deliberately.
 * The dashboard shows them because they are what turns into component wear;
 * this screen shows them because they are what its timeframe control is for,
 * and a rider asking what 2024 came to has nowhere else to ask. The duplicated
 * numbers are not the hazard the dashboard card's comment warns about: that
 * was two timeframe controls disagreeing on one scroll, and these are two
 * screens each showing its own control right above its own answer.
 *
 * The sections render open rather than as an accordion. On a screen whose only
 * job is this, six collapsed headers is a decision the rider should not have to
 * make, and the old accordion was one of two places on the dashboard offering
 * more than four choices at once.
 */
export default function RideInsightsScreen() {
  const router = useRouter();
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
      {/* The root Stack runs headerShown: false, so the `title` this screen used
          to set was never rendered: it had no header, no back control, and no
          top inset, which put the timeframe row under the status bar. Every
          other pushed screen draws its own header, so this one does too. */}
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerButton}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Riding Insights
          </Text>
          {/* Balances the back button so the title sits optically centered. */}
          <View style={styles.headerButton} />
        </View>

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
              {/* The totals come first because they are the question the
                  timeframe control above is asking. Without them this screen
                  answered "how consistently, and where" while the only place
                  showing how much was the dashboard, which is fixed to its own
                  timeframe and cannot say what 2024 came to. */}
              <Section icon="stats-chart-outline" title="Totals">
                <View style={styles.metricGrid}>
                  <Metric value={String(stats.totalRides)} label="Rides" />
                  <Metric
                    value={formatDuration(Math.round(stats.totalHours * 3600))}
                    label="Time"
                  />
                  <Metric value={formatDistance(stats.totalDistance)} label="Distance" />
                  <Metric
                    value={formatElevation(stats.totalElevation, distanceUnit)}
                    label="Climbing"
                  />
                </View>
              </Section>

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

              {/* Its own section rather than a tail on Totals: it is a
                  breakdown, and it belongs next to the other one. One bike at
                  100% is not a breakdown, so it waits for a second. */}
              {stats.bikeTime.length > 1 && (
                <Section icon="bicycle-outline" title="Time by bike">
                  {stats.bikeTime.map((bike) => (
                    <View key={bike.name} style={styles.bikeRow}>
                      <View style={styles.bikeInfo}>
                        <Text style={styles.bikeName} numberOfLines={1}>
                          {bike.name}
                        </Text>
                        <View style={styles.bikeTrack}>
                          <View style={[styles.bikeBar, { width: `${bike.percentage}%` }]} />
                        </View>
                      </View>
                      <Text style={styles.rowValue}>{bike.hours}h</Text>
                    </View>
                  ))}
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

/**
 * One headline number. Same treatment as the dashboard's totals grid, for the
 * same reason: these are the values a rider reads at a glance, and the two
 * screens showing the same four numbers should not disagree about their size.
 */
function Metric({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.metric}>
      {/* The value gets one line and is allowed to shrink into it; the label
          may wrap instead of forcing the grid to reflow around "Distance". */}
      <Text
        style={styles.metricValue}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {value}
      </Text>
      <Text style={styles.metricLabel} numberOfLines={2}>
        {label}
      </Text>
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
  // Same shape as component-rides and the other pushed screens: a 40pt back
  // target, a centered title, and a matching spacer so the title is centered
  // against the screen rather than against the remaining space.
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
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
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // Rows breathe more than columns so four numbers read as two pairs rather
    // than an even mesh.
    rowGap: space.xl,
    columnGap: space.lg,
  },
  metric: {
    // Two across, not four. "140,010 ft" needs ~114pt at title size and
    // "126h 6m" is not much shorter, so a quarter-width column would leave no
    // gutter and run the two values together. Falls to one column when
    // Dynamic Type leaves no room for two.
    minWidth: 120,
    flexGrow: 1,
    flexBasis: '47%',
  },
  metricValue: {
    ...type.title,
    color: colors.textPrimary,
  },
  metricLabel: {
    ...type.labelSmall,
    color: colors.textSecondary,
    marginTop: space.hair,
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
  bikeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
  },
  bikeInfo: {
    flex: 1,
    minWidth: 0,
    gap: space.sm,
  },
  bikeName: {
    ...type.caption,
    color: colors.textSecondary,
  },
  bikeTrack: {
    height: space.sm,
    backgroundColor: colors.cardBorder,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  bikeBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
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
