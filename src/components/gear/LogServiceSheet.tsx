import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { ComponentFieldsFragment, useLogComponentServiceMutation } from '../../graphql/generated';
import { StatusDot } from './StatusDot';
import { colors } from '../../constants/theme';

interface LogServiceSheetProps {
  visible: boolean;
  onClose: () => void;
  components: ComponentFieldsFragment[];
  onServiceLogged?: () => void;
  preSelectedId?: string | null;
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

export function LogServiceSheet({
  visible,
  onClose,
  components,
  onServiceLogged,
  preSelectedId,
}: LogServiceSheetProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    preSelectedId ? new Set([preSelectedId]) : new Set()
  );
  const [serviceDate, setServiceDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [logService, { loading }] = useLogComponentServiceMutation();

  const isToday = serviceDate.toDateString() === new Date().toDateString();

  const onDateChange = useCallback((_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) setServiceDate(date);
  }, []);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Filter to only serviceable components (those with service intervals)
  const serviceableComponents = components.filter(
    (c) => c.serviceDueAtHours !== null && c.serviceDueAtHours !== undefined
  );

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(serviceableComponents.map((c) => c.id)));
  }, [serviceableComponents]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleLogService = useCallback(async () => {
    if (selectedIds.size === 0) return;

    // Set to noon to prevent timezone shifts moving the date to the previous day
    const noon = new Date(serviceDate);
    noon.setHours(12, 0, 0, 0);
    const performedAt = noon.toISOString();
    const ids = Array.from(selectedIds);

    try {
      // Log service for all selected components
      await Promise.all(
        ids.map((id) =>
          logService({
            variables: {
              id,
              performedAt,
            },
          })
        )
      );

      const message =
        ids.length === 1
          ? 'Component service has been recorded.'
          : `Service has been recorded for ${ids.length} components.`;

      Alert.alert('Service Logged', message, [
        {
          text: 'OK',
          onPress: () => {
            setSelectedIds(new Set());
            onClose();
            onServiceLogged?.();
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    }
  }, [selectedIds, serviceDate, logService, onClose, onServiceLogged]);

  const handleClose = useCallback(() => {
    setSelectedIds(new Set());
    setServiceDate(new Date());
    setShowDatePicker(false);
    onClose();
  }, [onClose]);

  const allSelected =
    serviceableComponents.length > 0 &&
    selectedIds.size === serviceableComponents.length;

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

              <View style={styles.header}>
                <Text style={styles.title}>Log Service</Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.subheader}>
                <Text style={styles.subtitle}>
                  Select components to record service
                </Text>
                {serviceableComponents.length > 1 && (
                  <TouchableOpacity
                    onPress={allSelected ? deselectAll : selectAll}
                    style={styles.selectAllButton}
                  >
                    <Text style={styles.selectAllText}>
                      {allSelected ? 'Deselect All' : 'Select All'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.dateRow}>
                <Text style={styles.dateLabel}>Service date</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(!showDatePicker)}
                >
                  <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                  <Text style={styles.dateButtonText}>
                    {isToday ? 'Today' : serviceDate.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              </View>
              {showDatePicker && (
                <DateTimePicker
                  value={serviceDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  maximumDate={new Date()}
                  onChange={onDateChange}
                  themeVariant="dark"
                />
              )}

              <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                {serviceableComponents.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="construct-outline" size={48} color={colors.textMuted} />
                    <Text style={styles.emptyText}>
                      No serviceable components found
                    </Text>
                  </View>
                ) : (
                  serviceableComponents.map((component) => {
                    const isSelected = selectedIds.has(component.id);
                    const typeName = formatComponentType(component.type);
                    const location = formatLocation(component.location);
                    const brandModel = [component.brand, component.model]
                      .filter(Boolean)
                      .join(' ');

                    return (
                      <TouchableOpacity
                        key={component.id}
                        style={[
                          styles.componentItem,
                          isSelected && styles.componentItemSelected,
                        ]}
                        onPress={() => toggleSelection(component.id)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.checkbox}>
                          {isSelected ? (
                            <Ionicons name="checkbox" size={24} color={colors.primary} />
                          ) : (
                            <Ionicons name="square-outline" size={24} color={colors.textMuted} />
                          )}
                        </View>
                        <StatusDot status={component.status || 'UNKNOWN'} />
                        <View style={styles.componentContent}>
                          <Text style={styles.componentType}>
                            {location ? `${location} ${typeName}` : typeName}
                          </Text>
                          {brandModel && (
                            <Text style={styles.componentBrand}>{brandModel}</Text>
                          )}
                          <Text style={styles.componentHours}>
                            {component.hoursUsed?.toFixed(0) || 0} /{' '}
                            {component.serviceDueAtHours}h
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>

              <View style={styles.footer}>
                <TouchableOpacity
                  style={[
                    styles.logButton,
                    (selectedIds.size === 0 || loading) && styles.logButtonDisabled,
                  ]}
                  onPress={handleLogService}
                  disabled={selectedIds.size === 0 || loading}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.textPrimary} />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={20} color={colors.textPrimary} />
                      <Text style={styles.logButtonText}>
                        Log Service{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
                      </Text>
                    </>
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
    maxHeight: '70%',
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
  subheader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  dateLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryMuted,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  dateButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  selectAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  selectAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  list: {
    maxHeight: 300,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
  },
  componentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  componentItemSelected: {
    backgroundColor: colors.primaryMuted,
  },
  checkbox: {
    width: 24,
  },
  componentContent: {
    flex: 1,
  },
  componentType: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  componentBrand: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  componentHours: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  footer: {
    padding: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
  },
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  logButtonDisabled: {
    opacity: 0.5,
  },
  logButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
