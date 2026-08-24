import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Stack, useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useBikesWithPredictions } from '../src/hooks/useBikesWithPredictions';
import { useBulkBikeAssignment, MAX_RIDES_PER_PASS } from '../src/hooks/useBulkBikeAssignment';
import { useUnassignedRideSummaryQuery, RideProvider } from '../src/graphql/generated';
import { ErrorState } from '../src/components/common/ErrorState';
import { describeError } from '../src/utils/errorCopy';
import { colors, radius, space, type } from '../src/constants/theme';

type DateRange = '30days' | '3months' | '6months' | '1year' | 'all' | 'custom';

const DATE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: 'all', label: 'All Time' },
  { value: '30days', label: '30 Days' },
  { value: '3months', label: '3 Months' },
  { value: '6months', label: '6 Months' },
  { value: '1year', label: '1 Year' },
  { value: 'custom', label: 'Custom' },
];

/**
 * Generic platform names, never a per-ride attribution. These label a filter,
 * so they carry no Garmin device model and no partner brand color: DESIGN.md's
 * Guest Jersey Rule keeps third-party colors out of Loam's own controls, and
 * the ride rows already do the attribution work.
 */
const PROVIDER_LABELS: Record<RideProvider, string> = {
  [RideProvider.Strava]: 'Strava',
  [RideProvider.Garmin]: 'Garmin',
  [RideProvider.Whoop]: 'WHOOP',
  [RideProvider.Suunto]: 'Suunto',
  [RideProvider.Manual]: 'Manual',
};

/** Display order, so the row does not reshuffle as counts change. */
const PROVIDER_ORDER: RideProvider[] = [
  RideProvider.Strava,
  RideProvider.Garmin,
  RideProvider.Whoop,
  RideProvider.Suunto,
  RideProvider.Manual,
];

const SECONDS_PER_HOUR = 3600;

function presetWindow(range: DateRange): { startDate: string | null; endDate: string | null } {
  if (range === 'all' || range === 'custom') return { startDate: null, endDate: null };
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setHours(0, 0, 0, 0);
  switch (range) {
    case '30days':
      start.setDate(start.getDate() - 30);
      break;
    case '3months':
      start.setMonth(start.getMonth() - 3);
      break;
    case '6months':
      start.setMonth(start.getMonth() - 6);
      break;
    case '1year':
      start.setFullYear(start.getFullYear() - 1);
      break;
  }
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

function formatDay(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function bikeLabel(bike: { nickname?: string | null; manufacturer?: string | null; model?: string | null }) {
  return bike.nickname || [bike.manufacturer, bike.model].filter(Boolean).join(' ') || 'Bike';
}

/**
 * Bulk bike assignment.
 *
 * Garmin never reports gear, so on a multi-bike account every synced Garmin
 * ride lands with no bike and credits its hours to no component at all. Fixing
 * that one ride at a time is the wrong shape of work; this screen fixes a
 * whole provider, or a whole season, in one move.
 *
 * The selection is computed server-side throughout. The rides list is
 * paginated twenty at a time, so filtering what the client happens to hold
 * would quietly mean "the twenty rides on screen" while telling the rider it
 * meant all of them.
 */
export default function AssignRidesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { bikes, loading: bikesLoading } = useBikesWithPredictions();
  const activeBikes = useMemo(() => bikes.filter((bike) => !!bike?.id), [bikes]);

  const [bikeId, setBikeId] = useState<string | null>(null);
  const [provider, setProvider] = useState<RideProvider | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  const [openPicker, setOpenPicker] = useState<'start' | 'end' | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  // A single bike is not a choice worth making the rider tap through.
  const selectedBikeId = bikeId ?? (activeBikes.length === 1 ? activeBikes[0].id : null);
  const selectedBike = activeBikes.find((bike) => bike.id === selectedBikeId);

  const dateWindow = useMemo(() => {
    if (dateRange !== 'custom') return presetWindow(dateRange);
    // Copies, so widening the picked day to a full local day never mutates the
    // Date objects the pickers are still holding.
    const start = customStart ? new Date(customStart) : null;
    const end = customEnd ? new Date(customEnd) : null;
    start?.setHours(0, 0, 0, 0);
    end?.setHours(23, 59, 59, 999);
    return {
      startDate: start ? start.toISOString() : null,
      endDate: end ? end.toISOString() : null,
    };
  }, [dateRange, customStart, customEnd]);

  const invalidCustomRange =
    dateRange === 'custom' && !!customStart && !!customEnd && customStart > customEnd;

  const filter = useMemo(() => ({ ...dateWindow, provider }), [dateWindow, provider]);

  const { data, loading, error, refetch } = useUnassignedRideSummaryQuery({
    variables: { filter },
    fetchPolicy: 'cache-and-network',
    skip: invalidCustomRange,
  });
  const summary = data?.unassignedRideSummary;

  const { run, submitting, progress } = useBulkBikeAssignment();

  const matchCount = summary?.totalCount ?? 0;
  const matchHours = Math.round((summary?.totalDurationSeconds ?? 0) / SECONDS_PER_HOUR);

  // byProvider always describes the date-scoped set, whichever provider is
  // selected, so its sum is the "All" count and picking one never strands the
  // rider inside that bucket.
  const providerCounts = summary?.byProvider ?? [];
  const allCount = providerCounts.reduce((sum, entry) => sum + entry.count, 0);
  const visibleProviders = PROVIDER_ORDER.filter(
    // Keep the current selection visible at zero so the rider can see why the
    // preview says nothing matches, rather than watching the chip they just
    // tapped vanish.
    (candidate) =>
      provider === candidate || providerCounts.some((entry) => entry.provider === candidate)
  );

  const countFor = (candidate: RideProvider) =>
    providerCounts.find((entry) => entry.provider === candidate)?.count ?? 0;

  const clearFeedback = () => {
    setResult(null);
    setFailure(null);
  };

  const handleAssign = useCallback(() => {
    if (!selectedBikeId || !selectedBike || matchCount === 0) return;

    const name = bikeLabel(selectedBike);
    // Bulk assignment is not one-tap reversible, and the hours it credits can
    // push components past their service thresholds in a single move. Name
    // both numbers before it happens.
    Alert.alert(
      `Assign ${matchCount} ride${matchCount === 1 ? '' : 's'} to ${name}?`,
      `This adds about ${matchHours} h to its components and updates their service predictions.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Assign',
          onPress: async () => {
            clearFeedback();
            const outcome = await run({
              bikeId: selectedBikeId,
              filter,
              expectedCount: matchCount,
            });

            switch (outcome.kind) {
              case 'assigned':
                setResult(
                  outcome.remaining > 0
                    ? `Assigned ${outcome.assigned} rides to ${name}. ${outcome.remaining} more match: assign again to continue.`
                    : `Assigned ${outcome.assigned} ride${outcome.assigned === 1 ? '' : 's'} to ${name}.`
                );
                break;
              case 'nothing':
                // Does not name a cause: a ride leaves the unassigned set by
                // gaining a bike OR by being flagged "not my bike", and from
                // here the two are indistinguishable.
                setFailure('Those rides are no longer waiting on a bike. Nothing left to assign.');
                break;
              case 'partial':
                // Each chunk is its own transaction, so this work really did
                // land. Saying "failed" would send the rider back to redo it.
                setFailure(
                  `Assigned ${outcome.assigned} rides, then hit an error. The rest are unchanged: try again.`
                );
                break;
              case 'failed':
                setFailure('Could not assign those rides. Check your connection and try again.');
                break;
            }
            // No refetch here: the hook already refreshes this query along
            // with the rides list and the gear predictions, and asking twice
            // would just spend another round trip on the same answer.
          },
        },
      ]
    );
  }, [selectedBikeId, selectedBike, matchCount, matchHours, filter, run]);

  const dateSpan =
    summary?.earliestStartTime && summary?.latestStartTime
      ? `${formatDay(summary.earliestStartTime)} to ${formatDay(summary.latestStartTime)}`
      : null;

  const ctaLabel = submitting
    ? progress
      ? `Assigning ${progress.done} of ${progress.total}...`
      : 'Assigning...'
    : matchCount === 0
      ? 'Nothing to assign'
      : `Assign ${matchCount} ride${matchCount === 1 ? '' : 's'}`;

  const ctaDisabled = submitting || !selectedBikeId || matchCount === 0 || invalidCustomRange;

  return (
    <>
      {/* The root Stack runs headerShown: false, so this screen draws its own,
          like every other pushed screen. */}
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
            Assign a Bike
          </Text>
          <View style={styles.headerButton} />
        </View>

        {bikesLoading && activeBikes.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : activeBikes.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="bicycle-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No bikes yet</Text>
            <Text style={styles.emptyBody}>
              Add a bike first, then these rides can start counting toward its components.
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/bike/add' as Href)}
              accessibilityRole="button"
            >
              <Text style={styles.emptyButtonText}>Add a bike</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <ScrollView contentContainerStyle={styles.content}>
              <Text style={styles.intro}>
                Pick a bike, then narrow to the rides it should take. Their hours are credited to
                that bike&apos;s components.
              </Text>

              <Section title="Bike">
                <View style={styles.chipWrap}>
                  {activeBikes.map((bike) => {
                    const active = bike.id === selectedBikeId;
                    return (
                      <Chip
                        key={bike.id}
                        label={bikeLabel(bike)}
                        active={active}
                        onPress={() => {
                          setBikeId(bike.id);
                          clearFeedback();
                        }}
                      />
                    );
                  })}
                </View>
              </Section>

              <Section title="From">
                <View style={styles.chipWrap}>
                  <Chip
                    label="All"
                    count={allCount}
                    active={provider === null}
                    onPress={() => {
                      setProvider(null);
                      clearFeedback();
                    }}
                  />
                  {visibleProviders.map((candidate) => (
                    <Chip
                      key={candidate}
                      label={PROVIDER_LABELS[candidate]}
                      count={countFor(candidate)}
                      active={provider === candidate}
                      onPress={() => {
                        setProvider(candidate);
                        clearFeedback();
                      }}
                    />
                  ))}
                </View>
              </Section>

              <Section title="When">
                <View style={styles.chipWrap}>
                  {DATE_OPTIONS.map((option) => (
                    <Chip
                      key={option.value}
                      label={option.label}
                      active={dateRange === option.value}
                      onPress={() => {
                        setDateRange(option.value);
                        clearFeedback();
                      }}
                    />
                  ))}
                </View>

                {dateRange === 'custom' && (
                  <View style={styles.customRow}>
                    <TouchableOpacity
                      style={styles.dateButton}
                      onPress={() => setOpenPicker('start')}
                      accessibilityRole="button"
                      accessibilityLabel={
                        customStart ? `Start date ${formatDay(customStart.toISOString())}` : 'Pick a start date'
                      }
                    >
                      <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
                      <Text style={styles.dateButtonText}>
                        {customStart ? formatDay(customStart.toISOString()) : 'Start'}
                      </Text>
                    </TouchableOpacity>
                    <Text style={styles.dateSeparator}>to</Text>
                    <TouchableOpacity
                      style={styles.dateButton}
                      onPress={() => setOpenPicker('end')}
                      accessibilityRole="button"
                      accessibilityLabel={
                        customEnd ? `End date ${formatDay(customEnd.toISOString())}` : 'Pick an end date'
                      }
                    >
                      <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
                      <Text style={styles.dateButtonText}>
                        {customEnd ? formatDay(customEnd.toISOString()) : 'End'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {openPicker && (
                  <DateTimePicker
                    value={(openPicker === 'start' ? customStart : customEnd) ?? new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    maximumDate={new Date()}
                    onChange={(_, picked) => {
                      // Android dismisses on its own; iOS spinner stays until
                      // the rider taps away from it.
                      if (Platform.OS !== 'ios') setOpenPicker(null);
                      if (!picked) return;
                      if (openPicker === 'start') setCustomStart(picked);
                      else setCustomEnd(picked);
                      clearFeedback();
                    }}
                  />
                )}
                {openPicker && Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={styles.pickerDone}
                    onPress={() => setOpenPicker(null)}
                    accessibilityRole="button"
                  >
                    <Text style={styles.pickerDoneText}>Done</Text>
                  </TouchableOpacity>
                )}
              </Section>

              <View style={styles.preview}>
                {invalidCustomRange ? (
                  <Text style={styles.previewWarning}>Start date must come before end date.</Text>
                ) : error && !summary ? (
                  <ErrorState
                    variant="card"
                    {...describeError(error, 'these rides')}
                    onRetry={() => refetch()}
                  />
                ) : loading && !summary ? (
                  <Text style={styles.previewMuted}>Counting matching rides...</Text>
                ) : matchCount === 0 ? (
                  <Text style={styles.previewMuted}>
                    No rides without a bike match this. Try a wider window.
                  </Text>
                ) : (
                  <>
                    <Text style={styles.previewHeadline}>
                      {matchCount} ride{matchCount === 1 ? '' : 's'}
                      {selectedBike ? ` to ${bikeLabel(selectedBike)}` : ''}
                    </Text>
                    {/* The hours are the actual consequence: they land on this
                        bike's components and move its service predictions. */}
                    <Text style={styles.previewDetail}>
                      About {matchHours} h credited to its components.
                    </Text>
                    {dateSpan && <Text style={styles.previewDetail}>{dateSpan}</Text>}
                    {matchCount > MAX_RIDES_PER_PASS && (
                      <Text style={styles.previewDetail}>
                        Assigns {MAX_RIDES_PER_PASS} at a time. Run it again for the rest.
                      </Text>
                    )}
                  </>
                )}
              </View>

              {result && (
                <View style={styles.resultBanner}>
                  <Ionicons name="checkmark-circle-outline" size={18} color={colors.positiveOn} />
                  <Text style={styles.resultText}>{result}</Text>
                </View>
              )}

              {failure && (
                <View style={styles.failureBanner}>
                  <Ionicons name="alert-circle-outline" size={18} color={colors.criticalOn} />
                  <Text style={styles.failureText}>{failure}</Text>
                </View>
              )}
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: insets.bottom + space.lg }]}>
              <TouchableOpacity
                style={[styles.cta, ctaDisabled && styles.ctaDisabled]}
                onPress={handleAssign}
                disabled={ctaDisabled}
                accessibilityRole="button"
                accessibilityLabel={ctaLabel}
                accessibilityState={{ disabled: ctaDisabled, busy: submitting }}
              >
                {submitting && <ActivityIndicator size="small" color={colors.onPrimary} />}
                <Text style={styles.ctaText}>{ctaLabel}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

/**
 * Sage selection, never a partner's brand color: this is a Loam control, and
 * the health ramp is reserved for component wear.
 */
function Chip({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count?: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      accessibilityLabel={count === undefined ? label : `${label}, ${count} rides`}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
      {count !== undefined && (
        <Text style={[styles.chipCount, active && styles.chipCountActive]}>{count}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.xs,
    paddingBottom: space.md,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    ...type.subtitle,
    color: colors.textPrimary,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: space.section,
    gap: space.lg,
  },
  emptyTitle: {
    ...type.subtitle,
    color: colors.textPrimary,
  },
  emptyBody: {
    ...type.footnote,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: space.xxl,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  emptyButtonText: {
    ...type.calloutStrong,
    color: colors.onPrimary,
  },
  content: {
    paddingHorizontal: space.xl,
    paddingBottom: space.section,
    gap: space.xxl,
  },
  intro: {
    ...type.footnote,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  section: {
    gap: space.lg,
  },
  sectionTitle: {
    ...type.eyebrow,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 44,
    paddingHorizontal: space.xl,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    ...type.footnoteStrong,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.onPrimary,
  },
  chipCount: {
    ...type.caption,
    color: colors.textMuted,
  },
  chipCountActive: {
    color: colors.onPrimary,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 44,
    paddingHorizontal: space.xl,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  dateButtonText: {
    ...type.footnote,
    color: colors.textPrimary,
  },
  dateSeparator: {
    ...type.footnote,
    color: colors.textMuted,
  },
  pickerDone: {
    alignSelf: 'flex-end',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: space.xl,
  },
  pickerDoneText: {
    ...type.calloutStrong,
    color: colors.primary,
  },
  preview: {
    gap: space.xs,
    padding: space.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  previewHeadline: {
    ...type.subtitle,
    color: colors.textPrimary,
  },
  previewDetail: {
    ...type.footnote,
    color: colors.textSecondary,
  },
  previewMuted: {
    ...type.footnote,
    color: colors.textMuted,
  },
  previewWarning: {
    ...type.footnote,
    color: colors.cautionOn,
  },
  resultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.xl,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.positiveBorder,
    backgroundColor: colors.positiveBg,
  },
  resultText: {
    flex: 1,
    ...type.footnote,
    color: colors.textPrimary,
  },
  failureBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.xl,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.criticalBorder,
    backgroundColor: colors.criticalBg,
  },
  failureText: {
    flex: 1,
    ...type.footnote,
    color: colors.textPrimary,
  },
  footer: {
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    backgroundColor: colors.background,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    minHeight: 52,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  ctaDisabled: {
    opacity: 0.5,
  },
  ctaText: {
    ...type.bodyStrong,
    color: colors.onPrimary,
  },
});
