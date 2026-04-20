import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useBikeHistoryQuery } from '../../../src/graphql/generated';
import { useDistanceUnit } from '../../../src/hooks/useDistanceUnit';
import { colors } from '../../../src/constants/theme';
import {
  bikeName,
  componentDisplay,
  computeTimeframeRange,
  mergeAndGroupByYear,
  TIMEFRAME_LABEL,
  TIMEFRAME_SHORT_LABEL,
  type HistoryInstallEvent,
  type HistoryRide,
  type HistoryServiceEvent,
  type Timeframe,
  type TimelineItem,
} from '../../../src/lib/bikeHistory';
import { exportBikeHistoryPdf } from '../../../src/lib/bikeHistoryPdf';
import { formatDistance, formatDuration, formatElevation } from '../../../src/utils/greetingMessages';
import { EditServiceSheet, type EditableServiceLog } from '../../../src/components/gear/EditServiceSheet';
import { EditInstallSheet, type EditableInstallEvent } from '../../../src/components/gear/EditInstallSheet';

type Section = { title: number; data: TimelineItem[] };

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function BikeHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { distanceUnit } = useDistanceUnit();
  const [timeframe, setTimeframe] = useState<Timeframe>('all');
  const [showRides, setShowRides] = useState(true);
  const [showService, setShowService] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [editingService, setEditingService] = useState<{
    log: EditableServiceLog;
    componentLabel: string;
  } | null>(null);
  const [editingInstall, setEditingInstall] = useState<{
    event: EditableInstallEvent;
    componentLabel: string;
    hasPairedEvent: boolean;
  } | null>(null);

  const range = useMemo(() => computeTimeframeRange(timeframe), [timeframe]);

  const { data, loading, error } = useBikeHistoryQuery({
    variables: { bikeId: id!, startDate: range.startDate, endDate: range.endDate },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });

  const payload = data?.bikeHistory;

  // Base install-row ids that have BOTH an INSTALLED and a REMOVED event.
  // Drives the edit-install sheet's delete copy so we don't promise "two
  // events" when only one exists.
  const pairedBaseIds = useMemo(() => {
    if (!payload) return new Set<string>();
    const baseOf = (id: string) => {
      const i = id.lastIndexOf(':');
      return i > 0 ? id.slice(0, i) : id;
    };
    const seen = new Map<string, number>();
    for (const ev of payload.installs) {
      const base = baseOf(ev.id);
      seen.set(base, (seen.get(base) ?? 0) + 1);
    }
    return new Set(Array.from(seen).filter(([, n]) => n >= 2).map(([b]) => b));
  }, [payload]);

  const yearGroups = useMemo(() => {
    if (!payload) return [];
    return mergeAndGroupByYear({
      rides: payload.rides as HistoryRide[],
      serviceEvents: payload.serviceEvents as HistoryServiceEvent[],
      installs: payload.installs as HistoryInstallEvent[],
      showRides,
      showService,
    });
  }, [payload, showRides, showService]);

  const sections: Section[] = useMemo(
    () => yearGroups.map(({ year, items }) => ({ title: year, data: items })),
    [yearGroups]
  );

  const handleExport = async () => {
    if (!payload) return;
    setExporting(true);
    try {
      await exportBikeHistoryPdf({
        bike: payload.bike,
        totals: payload.totals,
        yearGroups,
        distanceUnit,
        timeframeLabel: TIMEFRAME_LABEL[timeframe],
        truncated: payload.truncated,
      });
    } catch (err) {
      Alert.alert('Export failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setExporting(false);
    }
  };

  if (!id) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'History' }} />
        <Text style={styles.errorText}>Missing bike id.</Text>
      </View>
    );
  }

  if (loading && !payload) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'History' }} />
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'History' }} />
        <Text style={styles.errorText}>Couldn't load history: {error.message}</Text>
      </View>
    );
  }

  if (!payload) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'History' }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: bikeName(payload.bike),
          headerBackTitle: '',
          headerRight: () => (
            <TouchableOpacity onPress={handleExport} disabled={exporting} style={styles.headerButton}>
              {exporting ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Ionicons name="share-outline" size={22} color={colors.primary} />
              )}
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.totalsRow}>
        <TotalCell label="Rides" value={payload.totals.rideCount.toLocaleString()} />
        <TotalCell label="Distance" value={formatDistance(payload.totals.totalDistanceMeters, distanceUnit)} />
        <TotalCell label="Elevation" value={formatElevation(payload.totals.totalElevationGainMeters, distanceUnit)} />
        <TotalCell
          label="Service"
          value={(payload.totals.serviceEventCount + payload.totals.installEventCount).toLocaleString()}
        />
      </View>

      <View style={styles.controlsRow}>
        {(Object.keys(TIMEFRAME_LABEL) as Timeframe[]).map((tf) => (
          <TouchableOpacity
            key={tf}
            onPress={() => setTimeframe(tf)}
            style={[styles.tfChip, timeframe === tf && styles.tfChipActive]}
          >
            <Text style={[styles.tfChipText, timeframe === tf && styles.tfChipTextActive]}>
              {TIMEFRAME_SHORT_LABEL[tf]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.togglesRow}>
        <TogglePill label="Rides" active={showRides} onPress={() => setShowRides((v) => !v)} />
        <TogglePill label="Service & Installs" active={showService} onPress={() => setShowService((v) => !v)} />
      </View>

      {payload.truncated && (
        <Text style={styles.truncatedNote}>
          Showing the most recent entries. Older events may be cut off for very long histories.
        </Text>
      )}

      {sections.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
          <Text style={styles.emptyText}>No events in this timeframe.</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) =>
            item.kind === 'ride'
              ? `r:${item.ride.id}`
              : item.kind === 'service'
              ? `s:${item.service.id}`
              : `i:${item.install.id}`
          }
          renderSectionHeader={({ section }) => (
            <Text style={styles.yearHeader}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <TimelineRow
              item={item}
              distanceUnit={distanceUnit}
              onEditService={(log, label) =>
                setEditingService({ log, componentLabel: label })
              }
              onEditInstall={(event, label) => {
                const baseIdx = event.id.lastIndexOf(':');
                const baseId = baseIdx > 0 ? event.id.slice(0, baseIdx) : event.id;
                setEditingInstall({
                  event,
                  componentLabel: label,
                  hasPairedEvent: pairedBaseIds.has(baseId),
                });
              }}
            />
          )}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
        />
      )}

      <EditServiceSheet
        visible={editingService !== null}
        log={editingService?.log ?? null}
        componentLabel={editingService?.componentLabel ?? ''}
        onClose={() => setEditingService(null)}
      />

      <EditInstallSheet
        visible={editingInstall !== null}
        event={editingInstall?.event ?? null}
        componentLabel={editingInstall?.componentLabel ?? ''}
        hasPairedEvent={editingInstall?.hasPairedEvent ?? false}
        onClose={() => setEditingInstall(null)}
      />
    </View>
  );
}

function TotalCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.totalCell}>
      <Text style={styles.totalLabel}>{label}</Text>
      <Text style={styles.totalValue}>{value}</Text>
    </View>
  );
}

function TogglePill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.togglePill, active && styles.togglePillActive]}>
      <Text style={[styles.togglePillText, active && styles.togglePillTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function TimelineRow({
  item,
  distanceUnit,
  onEditService,
  onEditInstall,
}: {
  item: TimelineItem;
  distanceUnit: 'mi' | 'km';
  onEditService: (log: EditableServiceLog, componentLabel: string) => void;
  onEditInstall: (event: EditableInstallEvent, componentLabel: string) => void;
}) {
  if (item.kind === 'ride') {
    const r = item.ride;
    const title = r.trailSystem || r.location || `${r.rideType} ride`;
    return (
      <View style={styles.row}>
        <Ionicons name="bicycle-outline" size={18} color={colors.textSecondary} style={styles.rowIcon} />
        <View style={styles.rowContent}>
          <Text style={styles.rowTitle} numberOfLines={1}>{title}</Text>
          <Text style={styles.rowMeta}>
            {formatShortDate(r.startTime)} · {formatDuration(r.durationSeconds)} · {formatDistance(r.distanceMeters, distanceUnit)} · {formatElevation(r.elevationGainMeters, distanceUnit)}
          </Text>
        </View>
      </View>
    );
  }
  if (item.kind === 'service') {
    const s = item.service;
    const label = componentDisplay(s.component);
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() =>
          onEditService(
            {
              id: s.id,
              performedAt: s.performedAt,
              notes: s.notes,
              hoursAtService: s.hoursAtService,
            },
            label
          )
        }
        activeOpacity={0.6}
      >
        <Ionicons name="construct-outline" size={18} color={colors.primary} style={styles.rowIcon} />
        <View style={styles.rowContent}>
          <Text style={styles.rowTitle} numberOfLines={1}>Service · {label}</Text>
          <Text style={styles.rowMeta} numberOfLines={1}>
            {formatShortDate(s.performedAt)} · {s.hoursAtService.toFixed(0)} hrs{s.notes ? ` · ${s.notes}` : ''}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={styles.rowChevron} />
      </TouchableOpacity>
    );
  }
  const i = item.install;
  const iconName = i.eventType === 'INSTALLED' ? 'add-circle-outline' : 'remove-circle-outline';
  const verb = i.eventType === 'INSTALLED' ? 'Installed' : 'Removed';
  const label = componentDisplay(i.component);
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() =>
        onEditInstall(
          { id: i.id, eventType: i.eventType, occurredAt: i.occurredAt },
          label
        )
      }
      activeOpacity={0.6}
    >
      <Ionicons name={iconName} size={18} color={colors.textSecondary} style={styles.rowIcon} />
      <View style={styles.rowContent}>
        <Text style={styles.rowTitle} numberOfLines={1}>{verb} · {label}</Text>
        <Text style={styles.rowMeta}>{formatShortDate(i.occurredAt)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={styles.rowChevron} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: 24 },
  errorText: { color: colors.danger, textAlign: 'center' },
  headerButton: { paddingHorizontal: 8, paddingVertical: 4 },
  totalsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 8 },
  totalCell: { flex: 1, backgroundColor: colors.card, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.cardBorder },
  totalLabel: { color: colors.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  totalValue: { color: colors.textPrimary, fontSize: 14, fontWeight: '700', marginTop: 2 },
  controlsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 8, gap: 6 },
  tfChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.cardBorder },
  tfChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
  tfChipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  tfChipTextActive: { color: colors.primary },
  togglesRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 8, gap: 6 },
  togglePill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.cardBorder },
  togglePillActive: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
  togglePillText: { color: colors.textSecondary, fontSize: 12 },
  togglePillTextActive: { color: colors.primary, fontWeight: '600' },
  truncatedNote: { color: colors.textMuted, fontSize: 11, fontStyle: 'italic', paddingHorizontal: 16, paddingTop: 8 },
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
  yearHeader: { color: colors.primary, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginTop: 12, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: colors.cardBorder, paddingBottom: 4 },
  row: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.cardBorder, alignItems: 'flex-start' },
  rowIcon: { marginRight: 10, marginTop: 2 },
  rowChevron: { marginLeft: 6, marginTop: 2 },
  rowContent: { flex: 1 },
  rowTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '500' },
  rowMeta: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { color: colors.textMuted },
});
