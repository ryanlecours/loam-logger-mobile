import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ComponentFieldsFragment, ComponentPrediction } from '../../graphql/generated';
import { ComponentHealthBadge } from './ComponentHealthBadge';

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
  if (!location) return '';
  return location
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
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
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="#6b7280" />
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

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                  {hoursRemaining !== null && hoursRemaining !== undefined && (
                    <View style={styles.statItem}>
                      <Ionicons
                        name={hoursRemaining <= 0 ? 'warning' : 'time-outline'}
                        size={20}
                        color={hoursRemaining <= 0 ? '#ef4444' : '#2563eb'}
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
                      <Ionicons name="refresh-outline" size={20} color="#6b7280" />
                      <Text style={styles.statValue}>{serviceInterval}h</Text>
                      <Text style={styles.statLabel}>Interval</Text>
                    </View>
                  )}

                  {hoursSinceService !== null && hoursSinceService !== undefined && (
                    <View style={styles.statItem}>
                      <Ionicons name="speedometer-outline" size={20} color="#6b7280" />
                      <Text style={styles.statValue}>{hoursSinceService.toFixed(0)}h</Text>
                      <Text style={styles.statLabel}>Since Service</Text>
                    </View>
                  )}

                  {ridesRemaining !== null && ridesRemaining !== undefined && ridesRemaining > 0 && (
                    <View style={styles.statItem}>
                      <Ionicons name="bicycle-outline" size={20} color="#6b7280" />
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
              </ScrollView>

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity style={styles.actionButton} onPress={onLogService}>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#2563eb" />
                  <Text style={styles.actionButtonText}>Log Service</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonSecondary]}
                  onPress={onReplace}
                >
                  <Ionicons name="swap-horizontal-outline" size={20} color="#6b7280" />
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 34,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#d1d5db',
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
    borderBottomColor: '#e5e7eb',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  brandModel: {
    fontSize: 15,
    color: '#6b7280',
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
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  notesSection: {
    marginTop: 16,
    padding: 14,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  notesText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  actionButtonSecondary: {
    backgroundColor: '#f3f4f6',
  },
  actionButtonText: {
    color: '#2563eb',
    fontSize: 15,
    fontWeight: '600',
  },
  actionButtonTextSecondary: {
    color: '#6b7280',
    fontSize: 15,
    fontWeight: '600',
  },
});
