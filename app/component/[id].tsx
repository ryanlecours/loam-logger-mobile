import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { useComponentHistoryQuery } from '../../src/graphql/generated';
import { colors, radius } from '../../src/constants/theme';
import { formatComponentType } from '../../src/utils/formatComponentType';
import {
  formatDistance,
  formatDuration,
  formatElevation,
} from '../../src/utils/greetingMessages';
import { useDistanceUnit } from '../../src/hooks/useDistanceUnit';
import { useUserTier } from '../../src/hooks/useUserTier';
import { GarminDerivedNote } from '../../src/components/attribution/GarminAttribution';
import { conditionIcon, conditionLabel, type WeatherCondition } from '../../src/lib/weather';

/**
 * Conditions bar tints, per the Data Visualization section of DESIGN.md.
 *
 * A lightness ramp from the neutral and sage families rather than a hue wheel:
 * the system has no sanctioned categorical palette, and the health ramp
 * (mahogany / terracotta / ember) is reserved for actual component wear. Every
 * row carries an icon, a label and a count, so colour is reinforcement rather
 * than the signal.
 *
 * Deliberately not `conditionTint` from src/lib/weather — that scale is built
 * for badge glyphs and includes hues outside the earth palette, which would
 * read as a chart claiming meaning it does not have.
 */
const CONDITION_BAR: Record<string, string> = {
  SUNNY: '#E8E6E2',
  CLOUDY: '#9E9EA4',
  RAINY: '#788C80',
  SNOWY: '#C3CFC7',
  FOGGY: '#8A8A91',
  WINDY: '#344A3E',
  UNKNOWN: '#3A3A3E',
};

const fmtDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Unknown';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function ComponentHistoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const componentId = String(params.id);
  const { distanceUnit } = useDistanceUnit();
  const { isPro } = useUserTier();
  const [range, setRange] = useState<'lifetime' | 'sinceService'>('lifetime');

  const { data, loading, error } = useComponentHistoryQuery({
    variables: { componentId },
    fetchPolicy: 'cache-and-network',
  });

  const payload = data?.componentHistory;

  // Every logbook entry is real work or a real inspection now. The old model
  // wrote a zero-hour ServiceLog on every install purely to position the
  // prediction anchor, which had to be filtered out by `hoursAtService > 0` — a
  // filter that also hid a genuine service on a part with no hours on it.
  const logEntries = payload?.serviceEvents ?? [];

  const conditions = useMemo(
    () =>
      (payload?.conditions ?? [])
        .filter((c) => c.rideCount > 0)
        .sort((a, b) => b.rideCount - a.rideCount),
    [payload?.conditions]
  );
  const maxConditionRides = conditions[0]?.rideCount ?? 1;

  const title = payload
    ? [payload.component.brand, payload.component.model].filter(Boolean).join(' ') ||
      formatComponentType(payload.component.type, payload.component.location)
    : 'History';

  if (loading && !payload) {
    return (
      <>
        <Stack.Screen options={{ title: 'History' }} />
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </>
    );
  }

  if (error || !payload) {
    return (
      <>
        <Stack.Screen options={{ title: 'History' }} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>
            {error?.message ?? 'This component could not be loaded.'}
          </Text>
        </View>
      </>
    );
  }

  const placement =
    payload.component.status === 'RETIRED'
      ? payload.component.retiredAt
        ? `Retired ${fmtDate(payload.component.retiredAt)}`
        : 'Retired'
      : payload.component.status === 'INVENTORY' || !payload.component.bikeId
      ? 'In inventory'
      : (() => {
          const current = payload.tenures.find(
            (t) => !t.removedAt && t.bike?.id === payload.component.bikeId
          );
          return current
            ? `On ${current.bike?.nickname || current.bike?.model || 'bike'} since ${fmtDate(
                current.installedAt
              )}`
            : 'Currently installed';
        })();

  // Hours come from the stored, ledger-backed counters: they include declared
  // pre-Loam hours, which the ride-summed totals cannot know about. The API
  // already returns sinceService that way. Rides, distance and elevation are
  // summed from the rides in either window.
  const shownTotals = range === 'lifetime' ? payload.lifetime : payload.sinceService;
  const shownSeconds =
    range === 'lifetime'
      ? Math.round(payload.component.lifetimeHours * 3600)
      : payload.sinceService.durationSeconds;
  const shownRides = shownTotals.rideCount;

  // Only the ride-derived sections need tenures; the logbook does not.
  const hasTenures = payload.coverage !== 'NO_TENURE_DATA';

  return (
    <>
      <Stack.Screen options={{ title: 'History' }} />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          {formatComponentType(payload.component.type, payload.component.location)} · {placement}
        </Text>

        {/* Derived from ride data, so contributing sources are named adjacent
            to the numbers and above the fold. */}
        <GarminDerivedNote style={styles.attribution} />

        {!hasTenures ? (
          <>
            <View style={styles.notice}>
              <Text style={styles.noticeText}>
                This component has no recorded time on a bike yet, so there is nothing to
                total up. Install it on a bike and its rides will start accruing here.
              </Text>
            </View>
            {/* Declared hours live on the component, not on any tenure, so a
                spare can carry them before it has ever been installed. */}
            {payload.component.priorHours > 0 && (
              <Text style={styles.caption}>
                {Math.round(payload.component.priorHours)}h declared before this component
                was tracked in Loam Logger.
              </Text>
            )}
          </>
        ) : (
          <>
            {/* Window toggle */}
            <View style={styles.toggleRow}>
              <Toggle
                label="Lifetime"
                active={range === 'lifetime'}
                onPress={() => setRange('lifetime')}
              />
              <Toggle
                label="Since last service"
                active={range === 'sinceService'}
                onPress={() => setRange('sinceService')}
              />
            </View>

            <View style={styles.statGrid}>
              <Stat label="Hours" value={formatDuration(shownSeconds)} />
              <Stat label="Rides" value={shownRides.toLocaleString()} />
              <Stat
                label="Distance"
                value={formatDistance(shownTotals.distanceMeters, distanceUnit)}
              />
              <Stat
                label="Elevation"
                value={formatElevation(shownTotals.elevationGainMeters, distanceUnit)}
              />
            </View>

            <Text style={styles.caption}>
              {range === 'lifetime'
                ? payload.lifetime.firstRideAt
                  ? `First recorded ride ${fmtDate(payload.lifetime.firstRideAt)}.`
                  : 'No rides recorded against this component yet.'
                : payload.anchor
                ? `Counting from the last service on ${fmtDate(payload.anchor)}.`
                : 'No service logged yet, so this counts every recorded ride.'}
            </Text>

            {/* Since a service, the hours are measured from that service's
                reading, so declared pre-Loam hours only remain in them while
                none is logged. */}
            {payload.component.priorHours > 0 && (range === 'lifetime' || !payload.anchor) && (
              <Text style={styles.caption}>
                Includes {Math.round(payload.component.priorHours)}h declared before this
                component was tracked in Loam Logger.
              </Text>
            )}

            {payload.component.inspectionDueAtHours != null && (
              <Text style={styles.caption}>
                Inspection: {Math.round(payload.component.hoursSinceInspection)}h since last
                check, every {Math.round(payload.component.inspectionDueAtHours)}h.
              </Text>
            )}

            {payload.historyIncomplete && (
              <View style={styles.notice}>
                <Text style={styles.noticeText}>
                  Part of this component's install history is missing, so these totals
                  may understate its real life. Deleting a bike removes the records
                  linking its rides to the parts that were on it.
                </Text>
              </View>
            )}

            {/* Bikes it has lived on */}
            <Text style={styles.sectionTitle}>BIKES IT HAS LIVED ON</Text>
            {payload.tenures.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={styles.tenureRow}
                activeOpacity={t.bike ? 0.7 : 1}
                disabled={!t.bike}
                onPress={() => t.bike && router.push(`/bike/${t.bike.id}` as Href)}
              >
                {t.bike?.thumbnailUrl ? (
                  <Image source={{ uri: t.bike.thumbnailUrl }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbFallback]}>
                    <Ionicons name="bicycle-outline" size={18} color={colors.textMuted} />
                  </View>
                )}
                <View style={styles.tenureInfo}>
                  <Text style={styles.tenureName} numberOfLines={1}>
                    {t.bike?.nickname ||
                      (t.bike ? `${t.bike.manufacturer} ${t.bike.model}` : 'Deleted bike')}
                  </Text>
                  <Text style={styles.tenureDates}>
                    {fmtDate(t.installedAt)} – {t.removedAt ? fmtDate(t.removedAt) : 'now'}
                    {t.synthetic ? ' · reconstructed' : ''}
                  </Text>
                </View>
                <View style={styles.tenureTotals}>
                  <Text style={styles.tenureHours}>
                    {formatDuration(t.totals.durationSeconds)}
                  </Text>
                  <Text style={styles.tenureMeta}>
                    {t.totals.rideCount} rides ·{' '}
                    {formatDistance(t.totals.distanceMeters, distanceUnit)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            {/* Conditions */}
            <Text style={styles.sectionTitle}>CONDITIONS RIDDEN IN</Text>
            {/* PRODUCT.md forbids invented precision, and the service engine is
                hours-only today. A conditions panel beside a health badge
                implies causation by adjacency, so the relationship is stated
                plainly rather than left to inference. */}
            <Text style={styles.caption}>
              Recorded from each ride's weather. Conditions are not currently factored
              into service intervals.
            </Text>
            {!isPro ? (
              <TouchableOpacity
                style={styles.proRow}
                onPress={() => router.push('/settings-detail/pricing' as Href)}
              >
                <Text style={styles.proText}>Ride conditions are recorded with Pro.</Text>
                <View style={styles.proChip}>
                  <Text style={styles.proChipText}>PRO</Text>
                </View>
              </TouchableOpacity>
            ) : conditions.length === 0 ? (
              <Text style={styles.emptyText}>
                No weather recorded for this component's rides yet.
              </Text>
            ) : (
              conditions.map((c) => (
                <View key={c.condition} style={styles.conditionRow}>
                  <Ionicons
                    name={conditionIcon(c.condition as WeatherCondition)}
                    size={16}
                    color={colors.textMuted}
                    style={styles.conditionIcon}
                  />
                  <Text style={styles.conditionLabel}>
                    {conditionLabel(c.condition as WeatherCondition)}
                  </Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${Math.max(4, (c.rideCount / maxConditionRides) * 100)}%`,
                          backgroundColor: CONDITION_BAR[c.condition] ?? colors.textMuted,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.conditionCount}>{c.rideCount}</Text>
                </View>
              ))
            )}
          </>
        )}

        {/* Logbook: work performed and inspections carried out. Outside the
            coverage gate because a spare with no tenures can still have been
            serviced or inspected. */}
        <Text style={styles.sectionTitle}>LOGBOOK</Text>
        {logEntries.length === 0 ? (
          <Text style={styles.emptyText}>Nothing logged yet.</Text>
        ) : (
          logEntries.map((s) => (
            <View key={s.id} style={styles.serviceRow}>
              <Ionicons
                name={s.kind === 'INSPECTION' ? 'eye-outline' : 'build-outline'}
                size={15}
                color={colors.textMuted}
              />
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceDate}>
                  {fmtDate(s.performedAt)}
                  <Text style={styles.serviceKind}>
                    {s.kind === 'INSPECTION' ? ' · Inspected' : ' · Serviced'}
                  </Text>
                </Text>
                {!!s.notes && <Text style={styles.serviceNotes}>{s.notes}</Text>}
              </View>
              {/* A lifetime reading, as a mechanic would write it. */}
              <Text style={styles.serviceHours}>at {Math.round(s.hoursAtService)}h</Text>
            </View>
          ))
        )}

        {hasTenures && (
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() =>
              // String href + `as Href` matches the app's router.push
              // convention; the typedRoutes union is regenerated by the
              // Expo CLI on start.
              router.push(
                (`/component-rides/${componentId}` +
                  `?componentLabel=${encodeURIComponent(title)}` +
                  `&bikeId=${encodeURIComponent(payload.component.bikeId ?? '')}`) as Href
              )
            }
          >
            <Text style={styles.linkText}>View the individual rides</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        )}
      </ScrollView>
    </>
  );
}

function Toggle({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.toggle, active && styles.toggleActive]}
    >
      <Text style={[styles.toggleText, active && styles.toggleTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 48 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  errorText: { color: colors.textSecondary, textAlign: 'center' },

  title: { color: colors.textPrimary, fontSize: 22, fontWeight: '700' },
  subtitle: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },
  attribution: { marginTop: 12 },

  toggleRow: { flexDirection: 'row', gap: 8, marginTop: 20, marginBottom: 12 },
  toggle: {
    // 44pt minimum touch target per DESIGN.md's native mapping.
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  toggleActive: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
  toggleText: { color: colors.textMuted, fontSize: 13 },
  toggleTextActive: { color: colors.positiveOn, fontWeight: '600' },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: {
    flexGrow: 1,
    flexBasis: '46%',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    padding: 12,
  },
  statLabel: { color: colors.textMuted, fontSize: 12 },
  statValue: { color: colors.textPrimary, fontSize: 18, fontWeight: '700', marginTop: 2 },

  caption: { color: colors.textMuted, fontSize: 12, marginTop: 10, lineHeight: 17 },

  notice: {
    marginTop: 14,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    gap: 8,
  },
  noticeText: { color: colors.textSecondary, fontSize: 12, lineHeight: 17 },

  sectionTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 28,
    marginBottom: 8,
  },

  tenureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    gap: 12,
  },
  thumb: { width: 44, height: 44, borderRadius: radius.sm },
  thumbFallback: {
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tenureInfo: { flex: 1, minWidth: 0 },
  tenureName: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  tenureDates: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  tenureTotals: { alignItems: 'flex-end' },
  tenureHours: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  tenureMeta: { color: colors.textMuted, fontSize: 11, marginTop: 2 },

  conditionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8 },
  conditionIcon: { width: 18 },
  // minWidth rather than width so labels and counts grow under Dynamic Type
  // instead of clipping; the bar's flex: 1 absorbs the difference.
  conditionLabel: { color: colors.textSecondary, fontSize: 13, minWidth: 72 },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: radius.full },
  conditionCount: { color: colors.textMuted, fontSize: 12, minWidth: 28, textAlign: 'right' },

  serviceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    gap: 10,
  },
  serviceInfo: { flex: 1 },
  serviceDate: { color: colors.textPrimary, fontSize: 14 },
  serviceNotes: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  serviceHours: { color: colors.textMuted, fontSize: 12 },
  serviceKind: { color: colors.textMuted, fontSize: 13 },

  emptyText: { color: colors.textMuted, fontSize: 13, paddingVertical: 8 },

  proRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    marginTop: 4,
  },
  proText: { color: colors.textSecondary, fontSize: 13 },
  proChip: {
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  proChipText: {
    color: colors.positiveOn,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    marginTop: 24,
  },
  linkText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
});
