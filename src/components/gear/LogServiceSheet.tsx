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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { ComponentFieldsFragment, useLogServiceMutation } from '../../graphql/generated';
import { StatusDot } from './StatusDot';
import { colors, radius } from '../../constants/theme';
import { formatComponentType } from '../../utils/formatComponentType';
import { useCurrency } from '../../hooks/useCurrency';
import { majorToMinor } from '../../lib/money';
import {
  PartsAndCostSection,
  partsAndCostInvalid,
  partsToInput,
  type PartDraft,
} from './PartsAndCostSection';
import { CurrencyPickerSheet } from '../settings/CurrencyPickerSheet';

interface LogServiceSheetProps {
  visible: boolean;
  onClose: () => void;
  components: ComponentFieldsFragment[];
  onServiceLogged?: () => void;
  preSelectedId?: string | null;
  /** Offered when a listed part looks like a whole-part replacement. */
  onReplaceInstead?: (componentId: string) => void;
}

export function LogServiceSheet({
  visible,
  onClose,
  components,
  onServiceLogged,
  preSelectedId,
  onReplaceInstead,
}: LogServiceSheetProps) {
  const insets = useSafeAreaInsets();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    preSelectedId ? new Set([preSelectedId]) : new Set()
  );
  const [serviceDate, setServiceDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  // Parts and cost belong to one service on one part, so they are only
  // offered when exactly one component is selected.
  const [cost, setCost] = useState('');
  const [parts, setParts] = useState<PartDraft[]>([]);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const { currency, setCurrency } = useCurrency();
  // logService returns the log, not the component, so the lists that used to
  // read the component straight off logComponentService's result refetch.
  const [logService, { loading }] = useLogServiceMutation({
    refetchQueries: ['Gear', 'GearLight', 'Bikes', 'BikeHistory'],
  });
  const singleSelectedId = selectedIds.size === 1 ? Array.from(selectedIds)[0] : null;
  const singleSelected = singleSelectedId
    ? components.find((c) => c.id === singleSelectedId) ?? null
    : null;
  const moneyInvalid = partsAndCostInvalid(cost, parts, currency);

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

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(components.map((c) => c.id)));
  }, [components]);

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
    if (moneyInvalid) return;

    // Parts and cost ride along only on a single-part service; with several
    // parts selected one total could not be attributed honestly. The
    // currency is always sent with an amount, so an edited Settings currency
    // never relabels what this entry recorded.
    const details =
      ids.length === 1
        ? (() => {
            const costMinor = cost.trim() === '' ? null : majorToMinor(cost, currency);
            const partInput = partsToInput(parts, currency);
            const hasAmount = costMinor != null || partInput.some((p) => p.priceMinor != null);
            return {
              ...(costMinor != null ? { costMinor } : {}),
              ...(hasAmount ? { currency } : {}),
              ...(partInput.length > 0 ? { parts: partInput } : {}),
            };
          })()
        : {};

    try {
      // Log service for all selected components
      await Promise.all(
        ids.map((componentId) =>
          logService({
            variables: {
              input: { componentId, performedAt, ...details },
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
            setCost('');
            setParts([]);
            onClose();
            onServiceLogged?.();
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    }
  }, [selectedIds, serviceDate, logService, onClose, onServiceLogged, cost, parts, currency, moneyInvalid]);

  const handleClose = useCallback(() => {
    setSelectedIds(new Set());
    setServiceDate(new Date());
    setShowDatePicker(false);
    setCost('');
    setParts([]);
    onClose();
  }, [onClose]);

  const allSelected =
    components.length > 0 &&
    selectedIds.size === components.length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose} accessible={false}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback accessible={false}>
            <View accessibilityViewIsModal style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <View style={styles.handle} />

              <View style={styles.header}>
                <Text style={styles.title}>Log Service</Text>
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.closeButton}
                  accessibilityRole="button"
                  accessibilityLabel="Close log service"
                >
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.subheader}>
                <Text style={styles.subtitle}>
                  Select components to record service
                </Text>
                {components.length > 1 && (
                  <TouchableOpacity
                    onPress={allSelected ? deselectAll : selectAll}
                    style={styles.selectAllButton}
                    accessibilityRole="button"
                    accessibilityLabel={allSelected ? 'Deselect all components' : 'Select all components'}
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
                  accessibilityRole="button"
                  accessibilityLabel={`Service date: ${serviceDate.toLocaleDateString()}. Change date.`}
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

              <ScrollView style={styles.list} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {components.length > 0 && (
                  <View style={styles.partsSection}>
                    <PartsAndCostSection
                      currency={currency}
                      cost={cost}
                      onCostChange={setCost}
                      parts={parts}
                      onPartsChange={setParts}
                      enabled={singleSelected !== null}
                      disabledHint="Select one part to record parts and cost, or add them later from the logbook."
                      componentBrandModel={
                        singleSelected ? [singleSelected.brand, singleSelected.model].filter(Boolean).join(' ') : null
                      }
                      onReplaceInstead={
                        onReplaceInstead && singleSelectedId
                          ? () => {
                              handleClose();
                              onReplaceInstead(singleSelectedId);
                            }
                          : undefined
                      }
                      onChangeCurrency={() => setShowCurrencyPicker(true)}
                    />
                  </View>
                )}
                {components.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="construct-outline" size={48} color={colors.textMuted} />
                    <Text style={styles.emptyText}>
                      No components found
                    </Text>
                  </View>
                ) : (
                  components.map((component) => {
                    const isSelected = selectedIds.has(component.id);
                    const label = formatComponentType(component.type, component.location);
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
                        accessibilityRole="checkbox"
                        accessibilityLabel={label}
                        accessibilityState={{ checked: isSelected }}
                      >
                        <View style={styles.checkbox} accessibilityElementsHidden>
                          {isSelected ? (
                            <Ionicons name="checkbox" size={24} color={colors.primary} />
                          ) : (
                            <Ionicons name="square-outline" size={24} color={colors.textMuted} />
                          )}
                        </View>
                        <StatusDot status={component.status || 'UNKNOWN'} />
                        <View style={styles.componentContent}>
                          <Text style={styles.componentType}>
                            {label}
                          </Text>
                          {brandModel && (
                            <Text style={styles.componentBrand}>{brandModel}</Text>
                          )}
                          <Text style={styles.componentHours}>
                            {component.serviceDueAtHours
                              ? `${component.hoursUsed?.toFixed(0) || 0} / ${component.serviceDueAtHours}h`
                              : `${component.hoursUsed?.toFixed(0) || 0}h used`}
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
                    (selectedIds.size === 0 || loading || moneyInvalid) && styles.logButtonDisabled,
                  ]}
                  onPress={handleLogService}
                  disabled={selectedIds.size === 0 || loading || moneyInvalid}
                  accessibilityRole="button"
                  accessibilityLabel={
                    selectedIds.size === 0
                      ? 'Log service. Select at least one component first.'
                      : moneyInvalid
                      ? 'Log service. Fix the amount first.'
                      : `Log service for ${selectedIds.size} component${selectedIds.size === 1 ? '' : 's'}`
                  }
                  accessibilityState={{ disabled: selectedIds.size === 0 || loading || moneyInvalid, busy: loading }}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.onPrimary} />
                  ) : (
                    <>
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={colors.onPrimary}
                        accessibilityElementsHidden
                      />
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
      <CurrencyPickerSheet
        visible={showCurrencyPicker}
        selected={currency}
        onSelect={(code) => {
          setCurrency(code).catch((error) => Alert.alert('Error', (error as Error).message));
        }}
        onClose={() => setShowCurrencyPicker(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  partsSection: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
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
    minHeight: 44,
    justifyContent: 'center',
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
    minHeight: 44,
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  dateButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.positiveOn,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  selectAllButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  selectAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  list: {
    maxHeight: 440,
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
    borderRadius: radius.full,
    gap: 8,
  },
  logButtonDisabled: {
    opacity: 0.5,
  },
  logButtonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
