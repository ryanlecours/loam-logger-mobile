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
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { ComponentFieldsFragment, ComponentPrediction, useSnoozeComponentMutation } from '../../graphql/generated';
import { ComponentHealthBadge } from './ComponentHealthBadge';

/** User-facing hints for what "service" means for specific component types */
const SERVICE_HINTS: Record<string, string> = {
  DRIVETRAIN: 'Clean and lube your chain, and inspect the drivetrain for wear.',
};

interface ComponentDetailSheetProps {
  visible: boolean;
  component: ComponentFieldsFragment | null;
  prediction?: ComponentPrediction | null;
  onClose: () => void;
  onLogService: () => void;
  onReplace: () => void;
}

function formatComponentType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatLocation(location: string | null | undefined): string {
  if (!location || location === 'NONE') return '';
  return location
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Never';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatConfidence(confidence: string | null | undefined): { label: string; color: string } {
  switch (confidence) {
    case 'HIGH':
      return { label: 'High', color: '#16a34a' };
    case 'MEDIUM':
      return { label: 'Medium', color: '#ca8a04' };
    case 'LOW':
      return { label: 'Low', color: '#dc2626' };
    default:
      return { label: 'Unknown', color: '#9ca3af' };
  }
}

export function ComponentDetailSheet({
  visible,
  component,
  prediction,
  onClose,
  onLogService,
  onReplace,
}: ComponentDetailSheetProps) {
  const [showSnoozeOptions, setShowSnoozeOptions] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customHours, setCustomHours] = useState('');
  const [snoozeSuccess, setSnoozeSuccess] = useState(false);

  const [snoozeComponent, { loading: snoozing }] = useSnoozeComponentMutation({
    refetchQueries: ['Gear', 'GearLight'],
  });

  const handleClose = useCallback(() => {
    setShowSnoozeOptions(false);
    setShowCustomInput(false);
    setCustomHours('');
    setSnoozeSuccess(false);
    onClose();
  }, [onClose]);

  const handleSnooze = useCallback(async (hours: number) => {
    if (!component) return;
    try {
      await snoozeComponent({
        variables: { id: component.id, hours },
      });
      setSnoozeSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 1000);
    } catch (err) {
      console.error('Failed to snooze component:', err);
    }
  }, [component, snoozeComponent, handleClose]);

  if (!component) return null;

  const typeName = formatComponentType(component.type);
  const location = formatLocation(component.location);
  const brandModel = [component.brand, component.model].filter(Boolean).join(' ');
  const status = prediction?.status || component.status || 'UNKNOWN';
  const confidence = formatConfidence(prediction?.confidence);

  const hoursRemaining = prediction?.hoursRemaining;
  const serviceInterval = prediction?.serviceIntervalHours || component.serviceDueAtHours;
  const hoursSinceService = prediction?.hoursSinceService;
  const ridesRemaining = prediction?.ridesRemainingEstimate;
  const lastServiced = component.lastServicedAt;
  const recommendedHours = serviceInterval ?? 50;

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
            <View style={styles.sheet}>
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
                {/* Status Badge */}
                <View style={styles.statusRow}>
                  <ComponentHealthBadge status={status} />
                  <View style={styles.confidenceRow}>
                    <Ionicons name="analytics-outline" size={14} color={confidence.color} />
                    <Text style={[styles.confidenceText, { color: confidence.color }]}>
                      {confidence.label} confidence
                    </Text>
                  </View>
                </View>

                {/* Service hint */}
                {SERVICE_HINTS[component.type] && status !== 'ALL_GOOD' && (
                  <View style={styles.serviceHint}>
                    <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.serviceHintText}>{SERVICE_HINTS[component.type]}</Text>
                  </View>
                )}

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                  {hoursRemaining !== null && hoursRemaining !== undefined && (
                    <View style={styles.statItem}>
                      <Ionicons
                        name={hoursRemaining <= 0 ? 'warning' : 'time-outline'}
                        size={20}
                        color={hoursRemaining <= 0 ? colors.danger : colors.primary}
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

                  {serviceInterval && (
                    <View style={styles.statItem}>
                      <Ionicons name="refresh-outline" size={20} color={colors.textSecondary} />
                      <Text style={styles.statValue}>{serviceInterval}h</Text>
                      <Text style={styles.statLabel}>Interval</Text>
                    </View>
                  )}

                  {hoursSinceService !== null && hoursSinceService !== undefined && (
                    <View style={styles.statItem}>
                      <Ionicons name="speedometer-outline" size={20} color={colors.textSecondary} />
                      <Text style={styles.statValue}>{hoursSinceService.toFixed(0)}h</Text>
                      <Text style={styles.statLabel}>Since Service</Text>
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

                {/* Last Serviced */}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Last Serviced</Text>
                  <Text style={styles.infoValue}>{formatDate(lastServiced)}</Text>
                </View>

                {/* Component Type */}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Type</Text>
                  <Text style={styles.infoValue}>
                    {component.isStock ? 'Stock' : 'Aftermarket'}
                  </Text>
                </View>

                {/* Notes */}
                {component.notes && (
                  <View style={styles.notesSection}>
                    <Text style={styles.notesLabel}>Notes</Text>
                    <Text style={styles.notesText}>{component.notes}</Text>
                  </View>
                )}

                {/* Snooze Options (shown after tapping Looks Good) */}
                {showSnoozeOptions && !snoozeSuccess && (
                  <View style={styles.snoozeSection}>
                    <Text style={styles.snoozeTitle}>Snooze for how long?</Text>
                    <View style={styles.snoozeOptions}>
                      <TouchableOpacity
                        style={styles.snoozePresetButton}
                        onPress={() => handleSnooze(recommendedHours)}
                        disabled={snoozing}
                      >
                        {snoozing && !showCustomInput ? (
                          <ActivityIndicator size="small" color={colors.textPrimary} />
                        ) : (
                          <Text style={styles.snoozePresetText}>
                            Snooze {recommendedHours}h
                          </Text>
                        )}
                      </TouchableOpacity>

                      {!showCustomInput ? (
                        <TouchableOpacity
                          onPress={() => setShowCustomInput(true)}
                          disabled={snoozing}
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
                              <ActivityIndicator size="small" color={colors.textPrimary} />
                            ) : (
                              <Text style={styles.customApplyText}>Apply</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* Snooze success feedback */}
                {snoozeSuccess && (
                  <View style={styles.snoozeSuccess}>
                    <Ionicons name="checkmark-circle" size={24} color={colors.good} />
                    <Text style={styles.snoozeSuccessText}>Snoozed!</Text>
                  </View>
                )}
              </ScrollView>

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.actionButtonLooksGood,
                    showSnoozeOptions && styles.actionButtonActive,
                  ]}
                  onPress={() => setShowSnoozeOptions(true)}
                  disabled={snoozing || snoozeSuccess}
                >
                  <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
                  <Text style={styles.actionButtonText}>
                    {snoozeSuccess ? 'Snoozed!' : 'Looks Good'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={onLogService}
                  disabled={snoozing || snoozeSuccess}
                >
                  <Ionicons name="build-outline" size={20} color={colors.primary} />
                  <Text style={styles.actionButtonText}>Service</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonSecondary]}
                  onPress={onReplace}
                  disabled={snoozing || snoozeSuccess}
                >
                  <Ionicons name="swap-horizontal-outline" size={20} color={colors.textSecondary} />
                  <Text style={styles.actionButtonTextSecondary}>Replace</Text>
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
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  serviceHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  serviceHintText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  confidenceText: {
    fontSize: 13,
    fontWeight: '500',
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  notesSection: {
    marginTop: 16,
    padding: 14,
    backgroundColor: colors.background,
    borderRadius: 10,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  notesText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  snoozeSection: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
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
    borderRadius: 8,
  },
  snoozePresetText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
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
    borderRadius: 8,
  },
  customApplyText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  snoozeSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  snoozeSuccessText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.good,
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
    backgroundColor: colors.primaryMuted,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 4,
  },
  actionButtonLooksGood: {
    backgroundColor: colors.primaryMuted,
  },
  actionButtonActive: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  actionButtonSecondary: {
    backgroundColor: colors.cardBorder,
  },
  actionButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtonTextSecondary: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
});
