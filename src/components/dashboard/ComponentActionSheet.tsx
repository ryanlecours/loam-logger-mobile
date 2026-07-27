import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  ComponentPrediction,
  useSnoozeComponentMutation,
  useUpdateComponentMutation,
} from '../../graphql/generated';
import { ComponentHealthBadge } from '../gear/ComponentHealthBadge';
import { ProChip } from '../common/UpgradePrompt';
import { colors, radius } from '../../constants/theme';
import { formatComponentType } from '../../utils/formatComponentType';

interface ComponentActionSheetProps {
  visible: boolean;
  prediction: ComponentPrediction | null;
  onClose: () => void;
  onLogService: () => void;
  onReplace: () => void;
  onActionComplete: () => void;
}

export function ComponentActionSheet({
  visible,
  prediction,
  onClose,
  onLogService,
  onReplace,
  onActionComplete,
}: ComponentActionSheetProps) {
  const insets = useSafeAreaInsets();
  const [showSnoozeOptions, setShowSnoozeOptions] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customHours, setCustomHours] = useState('');
  const [snoozeSuccess, setSnoozeSuccess] = useState(false);
  const [preSnoozeInterval, setPreSnoozeInterval] = useState<number | null>(null);
  const [snoozeError, setSnoozeError] = useState<string | null>(null);

  const [snoozeComponent, { loading: snoozing }] = useSnoozeComponentMutation({
    refetchQueries: ['Gear', 'GearLight'],
  });
  const [updateComponent, { loading: undoing }] = useUpdateComponentMutation({
    refetchQueries: ['Gear', 'GearLight'],
  });

  const handleClose = useCallback(() => {
    setShowSnoozeOptions(false);
    setShowCustomInput(false);
    setCustomHours('');
    setSnoozeSuccess(false);
    setPreSnoozeInterval(null);
    setSnoozeError(null);
    onClose();
  }, [onClose]);

  const handleSnooze = useCallback(async (hours: number) => {
    if (!prediction) return;
    setSnoozeError(null);
    try {
      // Remember the interval we are about to overwrite, so Undo has something
      // to restore. Captured before the mutation, not read back after it.
      setPreSnoozeInterval(prediction.serviceIntervalHours ?? null);
      await snoozeComponent({
        variables: { id: prediction.componentId, hours },
      });
      setSnoozeSuccess(true);
      // Deliberately no auto-close. Snoozing pushes a service date out; that is
      // the kind of change a rider should get to take back, and a 1000ms timer
      // closing the sheet gave them no chance to.
      onActionComplete();
    } catch (err) {
      console.error('Failed to snooze component:', err);
      setSnoozeError('That did not save. Check your signal and try again.');
    }
  }, [prediction, snoozeComponent, onActionComplete]);

  const handleUndoSnooze = useCallback(async () => {
    if (!prediction || preSnoozeInterval === null) return;
    setSnoozeError(null);
    try {
      await updateComponent({
        variables: {
          id: prediction.componentId,
          input: { serviceDueAtHours: preSnoozeInterval },
        },
      });
      setSnoozeSuccess(false);
      setShowSnoozeOptions(false);
      setPreSnoozeInterval(null);
      onActionComplete();
    } catch (err) {
      console.error('Failed to undo snooze:', err);
      setSnoozeError('Could not undo that. Try again.');
    }
  }, [prediction, preSnoozeInterval, updateComponent, onActionComplete]);

  if (!prediction) return null;

  const typeName = formatComponentType(prediction.componentType);
  const location = formatComponentType(prediction.location ?? '');
  const brandModel = [prediction.brand, prediction.model].filter(Boolean).join(' ');
  // No invented fallback. A component with no service interval has no
  // "recommended" snooze, and presenting one (this used to read "Snooze 50h")
  // is invented precision in a product whose whole claim is that its numbers
  // are explainable. Without an interval the rider gets the custom field only.
  const recommendedHours = prediction.serviceIntervalHours ?? null;
  // Pro-only prediction fields come back null for free-tier users.
  const hoursRemaining = prediction.hoursRemaining;
  const ridesRemaining = prediction.ridesRemainingEstimate;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <View style={styles.handle} />

              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerContent}>
                  <Text style={styles.title}>
                    {typeName}
                    {location ? ` (${location})` : ''}
                  </Text>
                  {brandModel && brandModel !== 'Stock' && (
                    <Text style={styles.brandModel}>{brandModel}</Text>
                  )}
                </View>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Status Badge — free tier gets a Pro chip where the
                    prediction status would sit */}
                <View style={styles.statusRow}>
                  {prediction.status ? (
                    <ComponentHealthBadge status={prediction.status} />
                  ) : (
                    <ProChip />
                  )}
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                  {hoursRemaining !== null && hoursRemaining !== undefined && (
                    <View style={styles.statItem}>
                      <Ionicons
                        name={hoursRemaining <= 0 ? 'warning' : 'time-outline'}
                        size={20}
                        color={hoursRemaining <= 0 ? colors.health.overdue.on : colors.primary}
                      />
                      <Text style={styles.statValue}>
                        {hoursRemaining <= 0
                          ? `${Math.abs(hoursRemaining).toFixed(0)}h overdue`
                          : `${hoursRemaining.toFixed(0)}h`}
                      </Text>
                      <Text style={styles.statLabel}>
                        {hoursRemaining <= 0 ? 'Overdue' : 'Remaining'}
                      </Text>
                    </View>
                  )}

                  <View style={styles.statItem}>
                    <Ionicons name="refresh-outline" size={20} color={colors.textSecondary} />
                    <Text style={styles.statValue}>{prediction.serviceIntervalHours}h</Text>
                    <Text style={styles.statLabel}>Interval</Text>
                  </View>

                  <View style={styles.statItem}>
                    <Ionicons name="speedometer-outline" size={20} color={colors.textSecondary} />
                    <Text style={styles.statValue}>{prediction.hoursSinceService.toFixed(0)}h</Text>
                    <Text style={styles.statLabel}>Since Service</Text>
                  </View>

                  {(hoursRemaining === null || hoursRemaining === undefined) && (
                    <View style={styles.statItem}>
                      <Ionicons name="bicycle-outline" size={20} color={colors.textSecondary} />
                      <Text style={styles.statValue}>{prediction.ridesSinceService}</Text>
                      <Text style={styles.statLabel}>Rides Since Service</Text>
                    </View>
                  )}

                  {ridesRemaining !== null && ridesRemaining !== undefined && ridesRemaining > 0 && (
                    <View style={styles.statItem}>
                      <Ionicons name="bicycle-outline" size={20} color={colors.textSecondary} />
                      <Text style={styles.statValue}>{ridesRemaining}</Text>
                      <Text style={styles.statLabel}>Rides Left</Text>
                    </View>
                  )}
                </View>

                {/* Snooze Options (shown after tapping Looks Good) */}
                {showSnoozeOptions && !snoozeSuccess && (
                  <View style={styles.snoozeSection}>
                    <Text style={styles.snoozeTitle}>Snooze for how long?</Text>
                    {recommendedHours === null && (
                      <Text style={styles.snoozeHint}>
                        This component has no service interval set, so there is nothing to
                        recommend. Enter the hours you want to add.
                      </Text>
                    )}
                    <View style={styles.snoozeOptions}>
                      {recommendedHours !== null && (
                        <TouchableOpacity
                          style={styles.snoozePresetButton}
                          onPress={() => handleSnooze(recommendedHours)}
                          disabled={snoozing}
                          accessibilityRole="button"
                          accessibilityLabel={`Snooze for ${recommendedHours} hours`}
                          accessibilityState={{ disabled: snoozing }}
                        >
                          {snoozing && !showCustomInput ? (
                            <ActivityIndicator size="small" color={colors.onPrimary} />
                          ) : (
                            <Text style={styles.snoozePresetText}>
                              Snooze {recommendedHours}h
                            </Text>
                          )}
                        </TouchableOpacity>
                      )}

                      {!showCustomInput && recommendedHours !== null ? (
                        <TouchableOpacity
                          onPress={() => setShowCustomInput(true)}
                          disabled={snoozing}
                          hitSlop={8}
                          accessibilityRole="button"
                          accessibilityLabel="Enter a custom snooze length"
                        >
                          <Text style={styles.customLink}>Custom</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.customRow}>
                          <TextInput
                            style={styles.customInput}
                            keyboardType="number-pad"
                            placeholder="Hours"
                            placeholderTextColor={colors.textMuted}
                            value={customHours}
                            onChangeText={setCustomHours}
                            autoFocus
                          />
                          <Text style={styles.customUnit}>h</Text>
                          <TouchableOpacity
                            style={[
                              styles.customApplyButton,
                              (!customHours || Number(customHours) < 1) && styles.buttonDisabled,
                            ]}
                            onPress={() => handleSnooze(Number(customHours))}
                            disabled={snoozing || !customHours || Number(customHours) < 1}
                          >
                            {snoozing ? (
                              <ActivityIndicator size="small" color={colors.onPrimary} />
                            ) : (
                              <Text style={styles.customApplyText}>Apply</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {snoozeError && (
                  <View style={styles.snoozeErrorRow} accessibilityRole="alert">
                    <Ionicons
                      name="alert-circle-outline"
                      size={16}
                      color={colors.criticalOn}
                      accessibilityElementsHidden
                    />
                    <Text style={styles.snoozeErrorText}>{snoozeError}</Text>
                  </View>
                )}

                {/* Snooze confirmation, with a way back out of it. */}
                {snoozeSuccess && (
                  <View style={styles.snoozeSuccess}>
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={colors.positiveOn}
                      accessibilityElementsHidden
                    />
                    <View style={styles.snoozeSuccessCopy}>
                      <Text style={styles.snoozeSuccessText}>Service pushed back</Text>
                      <Text style={styles.snoozeSuccessSub}>
                        We&apos;ll stop flagging this component until then.
                      </Text>
                    </View>
                    {preSnoozeInterval !== null && (
                      <TouchableOpacity
                        style={styles.undoButton}
                        onPress={handleUndoSnooze}
                        disabled={undoing}
                        accessibilityRole="button"
                        accessibilityLabel="Undo snooze"
                        accessibilityState={{ disabled: undoing }}
                      >
                        {undoing ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                          <Text style={styles.undoText}>Undo</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </ScrollView>

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.actionButtonPrimary,
                    showSnoozeOptions && styles.actionButtonActive,
                  ]}
                  onPress={() => setShowSnoozeOptions(true)}
                  disabled={snoozing || snoozeSuccess}
                >
                  <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
                  <Text style={styles.actionButtonTextPrimary}>
                    {snoozeSuccess ? 'Snoozed!' : 'Looks Good'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={onLogService}
                  disabled={snoozing || snoozeSuccess}
                >
                  <Ionicons name="build-outline" size={20} color={colors.textSecondary} />
                  <Text style={styles.actionButtonText}>Log Service</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={onReplace}
                  disabled={snoozing || snoozeSuccess}
                >
                  <Ionicons name="swap-horizontal-outline" size={20} color={colors.textSecondary} />
                  <Text style={styles.actionButtonText}>Replace</Text>
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
    maxHeight: '80%',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.cardBorder,
    borderRadius: radius.full,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  brandModel: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 4,
  },
  closeButton: {
    padding: 4,
    marginLeft: 12,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statItem: {
    width: '47%',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  snoozeSection: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  snoozeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  snoozeOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  snoozePresetButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.full,
  },
  snoozePresetText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onPrimary,
  },
  customLink: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  customInput: {
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.textPrimary,
    width: 70,
    textAlign: 'center',
  },
  customUnit: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  customApplyButton: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.full,
  },
  customApplyText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onPrimary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  snoozeHint: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  snoozeErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  snoozeErrorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: colors.criticalOn,
  },
  snoozeSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  snoozeSuccessCopy: {
    flex: 1,
    minWidth: 0,
  },
  snoozeSuccessText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.positiveOn,
  },
  snoozeSuccessSub: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: 2,
  },
  undoButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  undoText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.positiveOn,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBorder,
    paddingVertical: 12,
    borderRadius: radius.full,
    gap: 4,
  },
  actionButtonPrimary: {
    backgroundColor: colors.primaryMuted,
  },
  actionButtonActive: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  actionButtonText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtonTextPrimary: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
});
