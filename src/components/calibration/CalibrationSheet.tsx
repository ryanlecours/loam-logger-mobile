import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BikeCalibrationSection } from './BikeCalibrationSection';
import { colors } from '../../constants/theme';
import {
  useCalibrationStateQuery,
  useLogBulkComponentServiceMutation,
  useDismissCalibrationMutation,
  useCompleteCalibrationMutation,
  useSnoozeComponentMutation,
  CalibrationStateDocument,
  GearDocument,
} from '../../graphql/generated';

interface CalibrationSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function CalibrationSheet({ visible, onClose }: CalibrationSheetProps) {
  const { data, loading } = useCalibrationStateQuery({
    fetchPolicy: 'cache-and-network',
    skip: !visible,
  });

  const [logBulkService] = useLogBulkComponentServiceMutation();
  const [dismissCalibration] = useDismissCalibrationMutation({
    refetchQueries: [{ query: CalibrationStateDocument }],
  });
  const [completeCalibration] = useCompleteCalibrationMutation({
    refetchQueries: [{ query: CalibrationStateDocument }, { query: GearDocument }],
  });
  const [snoozeComponent] = useSnoozeComponentMutation();

  const [calibratedIds, setCalibratedIds] = useState<Set<string>>(new Set());
  const [expandedBikeId, setExpandedBikeId] = useState<string | null>(null);
  const [bulkDates, setBulkDates] = useState<Record<string, Date>>({});
  const [selectedComponents, setSelectedComponents] = useState<Record<string, Set<string>>>({});
  const [pendingServiceLogs, setPendingServiceLogs] = useState<Map<string, string>>(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const bikes = useMemo(() => data?.calibrationState?.bikes ?? [], [data]);

  // Total components across all bikes
  const totalComponents = useMemo(
    () => bikes.reduce((sum, b) => sum + b.components.length, 0),
    [bikes]
  );

  const calibratedCount = calibratedIds.size;
  const progressPercent = totalComponents > 0 ? (calibratedCount / totalComponents) * 100 : 0;

  // Reset state when sheet opens
  useEffect(() => {
    if (visible) {
      setCalibratedIds(new Set());
      setBulkDates({});
      setSelectedComponents({});
      setPendingServiceLogs(new Map());
      setIsSubmitting(false);
    }
  }, [visible]);

  // Expand first bike when data loads
  useEffect(() => {
    if (visible && bikes.length > 0 && expandedBikeId === null) {
      setExpandedBikeId(bikes[0].bikeId);
    }
  }, [visible, bikes, expandedBikeId]);

  const handleToggleSelection = useCallback((bikeId: string, componentId: string) => {
    setSelectedComponents((prev) => {
      const bikeSet = new Set(prev[bikeId] ?? []);
      if (bikeSet.has(componentId)) {
        bikeSet.delete(componentId);
      } else {
        bikeSet.add(componentId);
      }
      return { ...prev, [bikeId]: bikeSet };
    });
  }, []);

  const handleBulkDateChange = useCallback((bikeId: string, date: Date) => {
    setBulkDates((prev) => ({ ...prev, [bikeId]: date }));
  }, []);

  const handleBulkApply = useCallback(
    (bikeId: string) => {
      const bike = bikes.find((b) => b.bikeId === bikeId);
      if (!bike) return;

      const selected = selectedComponents[bikeId] ?? new Set();
      if (selected.size === 0) return;

      const date = bulkDates[bikeId] ?? new Date();
      const noon = new Date(date);
      noon.setHours(12, 0, 0, 0);
      const performedAt = noon.toISOString();

      setPendingServiceLogs((prev) => {
        const next = new Map(prev);
        selected.forEach((id) => next.set(id, performedAt));
        return next;
      });

      setCalibratedIds((prev) => {
        const next = new Set(prev);
        selected.forEach((id) => next.add(id));
        return next;
      });

      // Clear selection for this bike
      setSelectedComponents((prev) => ({ ...prev, [bikeId]: new Set() }));
    },
    [bikes, selectedComponents, bulkDates]
  );

  const handleAcknowledge = useCallback((componentId: string) => {
    setCalibratedIds((prev) => new Set([...prev, componentId]));
  }, []);

  const handleSnooze = useCallback(
    async (componentId: string) => {
      try {
        await snoozeComponent({ variables: { id: componentId } });
        setCalibratedIds((prev) => new Set([...prev, componentId]));
      } catch {
        // Snooze failed silently — user can retry
      }
    },
    [snoozeComponent]
  );

  const handleDismiss = useCallback(async () => {
    try {
      await dismissCalibration();
    } catch {
      // Dismiss failed silently
    }
    onClose();
  }, [dismissCalibration, onClose]);

  const handleComplete = useCallback(async () => {
    setIsSubmitting(true);
    try {
      // Submit pending service logs grouped by date
      if (pendingServiceLogs.size > 0) {
        const logsByDate = new Map<string, string[]>();
        pendingServiceLogs.forEach((performedAt, componentId) => {
          const existing = logsByDate.get(performedAt) ?? [];
          existing.push(componentId);
          logsByDate.set(performedAt, existing);
        });

        for (const [performedAt, componentIds] of logsByDate) {
          await logBulkService({
            variables: { input: { componentIds, performedAt } },
          });
        }
      }

      await completeCalibration();
      onClose();
    } catch {
      setIsSubmitting(false);
    }
  }, [pendingServiceLogs, logBulkService, completeCalibration, onClose]);

  const handleClose = useCallback(() => {
    if (!isSubmitting) handleDismiss();
  }, [isSubmitting, handleDismiss]);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              <View style={styles.handle} />

              <View style={styles.header}>
                <Text style={styles.title}>Calibrate Your Components</Text>
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.closeButton}
                  disabled={isSubmitting}
                >
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Progress bar */}
              {totalComponents > 0 && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
                  </View>
                  <Text style={styles.progressText}>
                    {calibratedCount} / {totalComponents} calibrated
                  </Text>
                </View>
              )}

              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.infoText}>
                  Set service dates so wear predictions are accurate. Tap{' '}
                  <Ionicons name="checkmark" size={13} color={colors.primary} /> to acknowledge
                  hours are correct, or{' '}
                  <Ionicons name="time-outline" size={13} color={colors.primary} /> to extend the
                  interval.
                </Text>
              </View>

              {loading && bikes.length === 0 ? (
                <View style={styles.loading}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : (
                <ScrollView
                  style={styles.list}
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                >
                  {bikes.map((bike) => (
                    <BikeCalibrationSection
                      key={bike.bikeId}
                      bikeId={bike.bikeId}
                      bikeName={bike.bikeName}
                      components={bike.components}
                      isExpanded={expandedBikeId === bike.bikeId}
                      onToggleExpanded={() =>
                        setExpandedBikeId(
                          expandedBikeId === bike.bikeId ? null : bike.bikeId
                        )
                      }
                      calibratedIds={calibratedIds}
                      selectedIds={selectedComponents[bike.bikeId] ?? new Set()}
                      onToggleSelection={(cid) => handleToggleSelection(bike.bikeId, cid)}
                      bulkDate={bulkDates[bike.bikeId] ?? new Date()}
                      onBulkDateChange={(d) => handleBulkDateChange(bike.bikeId, d)}
                      onBulkApply={() => handleBulkApply(bike.bikeId)}
                      onSnooze={handleSnooze}
                      onAcknowledge={handleAcknowledge}
                      disabled={isSubmitting}
                    />
                  ))}
                </ScrollView>
              )}

              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.dismissButton}
                  onPress={handleDismiss}
                  disabled={isSubmitting}
                >
                  <Text style={styles.dismissText}>Remind Me Later</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.completeButton, isSubmitting && styles.completeButtonDisabled]}
                  onPress={handleComplete}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={colors.textPrimary} />
                  ) : (
                    <Text style={styles.completeText}>
                      {calibratedCount > 0 ? 'Complete Calibration' : 'Done'}
                    </Text>
                  )}
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
    maxHeight: '90%',
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
  progressContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.cardBorder,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 12,
    backgroundColor: colors.primaryMuted,
    borderRadius: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  loading: {
    padding: 40,
    alignItems: 'center',
  },
  list: {
    flexGrow: 0,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
  },
  dismissButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  dismissText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  completeButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  completeButtonDisabled: {
    opacity: 0.5,
  },
  completeText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
});
