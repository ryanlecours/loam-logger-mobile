import { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, ActivityIndicator, Alert, Modal, Platform } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { useBikeHistoryQuery, useBulkUpdateBikeComponentInstallsMutation } from '../../../src/graphql/generated';
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
  // Multi-select: only INSTALLED events are selectable (backend bulk
  // mutation only moves installedAt). Stores install BASE ids (the
  // ":installed"/":removed" suffix stripped) for direct use in the bulk
  // mutation payload.
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedInstallIds, setSelectedInstallIds] = useState<Set<string>>(new Set());
  const [bulkDateOpen, setBulkDateOpen] = useState(false);

  const range = useMemo(() => computeTimeframeRange(timeframe), [timeframe]);

  const { data, loading, error } = useBikeHistoryQuery({
    variables: { bikeId: id!, startDate: range.startDate, endDate: range.endDate },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });

  const [bulkUpdateInstalls] = useBulkUpdateBikeComponentInstallsMutation({
    refetchQueries: ['BikeHistory', 'Gear', 'GearLight'],
  });

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedInstallIds(new Set());
  }, []);

  const toggleInstallSelection = useCallback((baseId: string) => {
    setSelectedInstallIds((prev) => {
      const next = new Set(prev);
      if (next.has(baseId)) next.delete(baseId);
      else next.add(baseId);
      return next;
    });
  }, []);

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
          title: selectionMode ? `${selectedInstallIds.size} selected` : bikeName(payload.bike),
          headerBackTitle: '',
          headerRight: () =>
            selectionMode ? (
              <TouchableOpacity onPress={exitSelectionMode} style={styles.headerButton}>
                <Text style={styles.headerButtonText}>Cancel</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.headerActions}>
                <TouchableOpacity
                  onPress={() => setSelectionMode(true)}
                  style={styles.headerButton}
                >
                  <Ionicons name="calendar-outline" size={22} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleExport} disabled={exporting} style={styles.headerButton}>
                  {exporting ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <Ionicons name="share-outline" size={22} color={colors.primary} />
                  )}
                </TouchableOpacity>
              </View>
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
          renderItem={({ item }) => {
            const installBaseId =
              item.kind === 'install'
                ? (() => {
                    const idx = item.install.id.lastIndexOf(':');
                    return idx > 0 ? item.install.id.slice(0, idx) : item.install.id;
                  })()
                : null;
            const isSelectable =
              selectionMode && item.kind === 'install' && item.install.eventType === 'INSTALLED';
            const isSelected = !!installBaseId && selectedInstallIds.has(installBaseId);
            return (
              <TimelineRow
                item={item}
                distanceUnit={distanceUnit}
                selectable={isSelectable}
                selected={isSelected}
                onEditService={(log, label) => {
                  if (selectionMode) return;
                  setEditingService({ log, componentLabel: label });
                }}
                onEditInstall={(event, label) => {
                  if (selectionMode) {
                    if (isSelectable && installBaseId) toggleInstallSelection(installBaseId);
                    return;
                  }
                  const baseIdx = event.id.lastIndexOf(':');
                  const baseId = baseIdx > 0 ? event.id.slice(0, baseIdx) : event.id;
                  setEditingInstall({
                    event,
                    componentLabel: label,
                    hasPairedEvent: pairedBaseIds.has(baseId),
                  });
                }}
              />
            );
          }}
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

      {selectionMode && (
        <View style={styles.selectionBar}>
          <Text style={styles.selectionBarText}>
            {selectedInstallIds.size === 0
              ? 'Tap install events to select'
              : `${selectedInstallIds.size} selected`}
          </Text>
          <TouchableOpacity
            style={[
              styles.selectionBarButton,
              selectedInstallIds.size === 0 && styles.selectionBarButtonDisabled,
            ]}
            disabled={selectedInstallIds.size === 0}
            onPress={() => setBulkDateOpen(true)}
          >
            <Ionicons name="calendar-outline" size={16} color={colors.textPrimary} />
            <Text style={styles.selectionBarButtonText}>Set date</Text>
          </TouchableOpacity>
        </View>
      )}

      <BulkDateSheet
        visible={bulkDateOpen}
        count={selectedInstallIds.size}
        onClose={() => setBulkDateOpen(false)}
        onConfirm={async (isoDate) => {
          try {
            await bulkUpdateInstalls({
              variables: {
                input: {
                  ids: Array.from(selectedInstallIds),
                  installedAt: isoDate,
                },
              },
            });
            setBulkDateOpen(false);
            exitSelectionMode();
          } catch (err) {
            Alert.alert('Error', (err as Error).message);
          }
        }}
      />
    </View>
  );
}

function BulkDateSheet({
  visible,
  count,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  count: number;
  onClose: () => void;
  onConfirm: (isoDate: string) => Promise<void>;
}) {
  const [date, setDate] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    // Noon-anchor to keep the calendar date stable across timezone round-trips.
    const noon = new Date(date);
    noon.setHours(12, 0, 0, 0);
    try {
      await onConfirm(noon.toISOString());
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.bulkOverlay}>
        <View style={styles.bulkSheet}>
          <View style={styles.bulkHeader}>
            <Text style={styles.bulkTitle}>
              Set date for {count} install{count === 1 ? '' : 's'}
            </Text>
            <TouchableOpacity onPress={onClose} disabled={busy}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.bulkBody}>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowPicker(!showPicker)}
            >
              <Ionicons name="calendar-outline" size={16} color={colors.primary} />
              <Text style={styles.dateButtonText}>{date.toLocaleDateString()}</Text>
            </TouchableOpacity>
            {showPicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                maximumDate={new Date()}
                onChange={(_e: DateTimePickerEvent, d?: Date) => {
                  if (Platform.OS === 'android') setShowPicker(false);
                  if (d) setDate(d);
                }}
                themeVariant="dark"
              />
            )}
            <Text style={styles.bulkHint}>
              Applies to every selected install event. Baseline service anchors move alongside.
            </Text>
          </View>

          <View style={styles.bulkFooter}>
            <TouchableOpacity
              style={styles.bulkCancelButton}
              onPress={onClose}
              disabled={busy}
            >
              <Text style={styles.bulkCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bulkApplyButton, busy && { opacity: 0.5 }]}
              onPress={handleConfirm}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color={colors.textPrimary} />
              ) : (
                <Text style={styles.bulkApplyText}>Apply</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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
  selectable = false,
  selected = false,
  onEditService,
  onEditInstall,
}: {
  item: TimelineItem;
  distanceUnit: 'mi' | 'km';
  selectable?: boolean;
  selected?: boolean;
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
      style={[styles.row, selected && styles.rowSelected]}
      onPress={() =>
        onEditInstall(
          { id: i.id, eventType: i.eventType, occurredAt: i.occurredAt },
          label
        )
      }
      activeOpacity={0.6}
    >
      {selectable && (
        <View
          style={[styles.checkbox, selected && styles.checkboxChecked]}
        >
          {selected && <Ionicons name="checkmark" size={12} color={colors.textPrimary} />}
        </View>
      )}
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
  rowSelected: { backgroundColor: colors.primaryMuted },
  rowIcon: { marginRight: 10, marginTop: 2 },
  rowChevron: { marginLeft: 6, marginTop: 2 },
  rowContent: { flex: 1 },
  rowTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '500' },
  rowMeta: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginRight: 10,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { color: colors.textMuted },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerButtonText: { color: colors.primary, fontSize: 16, fontWeight: '500', paddingHorizontal: 8 },
  selectionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  selectionBarText: { color: colors.textPrimary, fontSize: 14, fontWeight: '500' },
  selectionBarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  selectionBarButtonDisabled: { opacity: 0.5 },
  selectionBarButtonText: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  bulkOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bulkSheet: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 24 },
  bulkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  bulkTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  bulkBody: { paddingHorizontal: 20, paddingVertical: 8, gap: 12 },
  bulkHint: { fontSize: 12, color: colors.textMuted },
  bulkFooter: { flexDirection: 'row', gap: 12, padding: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.cardBorder },
  bulkCancelButton: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder },
  bulkCancelText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  bulkApplyButton: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 10 },
  bulkApplyText: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
  dateButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primaryMuted, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, alignSelf: 'flex-start' },
  dateButtonText: { fontSize: 14, fontWeight: '500', color: colors.primary },
});
