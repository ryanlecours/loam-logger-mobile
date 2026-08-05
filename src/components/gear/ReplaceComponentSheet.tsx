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
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import {
  ComponentFieldsFragment,
  useInstallComponentMutation,
} from '../../graphql/generated';
import { colors, radius } from '../../constants/theme';
import { isTierError, getTierErrorMessage } from '../../utils/tierErrors';
import { formatComponentType } from '../../utils/formatComponentType';
import type { ApolloError } from '@apollo/client';

interface ReplaceComponentSheetProps {
  visible: boolean;
  component: ComponentFieldsFragment | null;
  bikeId: string;
  spareComponents: ComponentFieldsFragment[];
  onClose: () => void;
  onReplaced: () => void;
}

type TabType = 'spare' | 'new';

export function ReplaceComponentSheet({
  visible,
  component,
  bikeId,
  spareComponents,
  onClose,
  onReplaced,
}: ReplaceComponentSheetProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>('spare');
  const [selectedSpareId, setSelectedSpareId] = useState<string | null>(null);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [note, setNote] = useState('');
  const [installedAt, setInstalledAt] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [installComponent, { loading }] = useInstallComponentMutation();

  // Filter spare components to only those matching the component type
  const matchingSpares = component
    ? spareComponents.filter((spare) => spare.type === component.type)
    : [];

  const resetForm = useCallback(() => {
    setActiveTab('spare');
    setSelectedSpareId(null);
    setBrand('');
    setModel('');
    setNote('');
    setInstalledAt(new Date());
    setShowDatePicker(false);
  }, []);

  const onDateChange = useCallback((_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) setInstalledAt(date);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleSubmit = useCallback(async () => {
    if (!component) return;

    // Build slotKey from type and location
    const slotKey = component.location
      ? `${component.type}_${component.location}`
      : component.type;

    // Noon to prevent timezone shifts moving the date to the previous day.
    const noon = new Date(installedAt);
    noon.setHours(12, 0, 0, 0);
    const installedAtIso = noon.toISOString();

    try {
      if (activeTab === 'spare' && selectedSpareId) {
        await installComponent({
          variables: {
            input: {
              bikeId,
              slotKey,
              existingComponentId: selectedSpareId,
              noteText: note || undefined,
              installedAt: installedAtIso,
            },
          },
          refetchQueries: ['Gear', 'BikeHistory'],
        });
      } else if (activeTab === 'new' && brand.trim() && model.trim()) {
        await installComponent({
          variables: {
            input: {
              bikeId,
              slotKey,
              newComponent: {
                brand: brand.trim(),
                model: model.trim(),
              },
              noteText: note || undefined,
              installedAt: installedAtIso,
            },
          },
          refetchQueries: ['Gear', 'BikeHistory'],
        });
      } else {
        Alert.alert('Validation Error', 'Please fill in all required fields.');
        return;
      }

      Alert.alert('Component Replaced', 'The component has been replaced successfully.', [
        {
          text: 'OK',
          onPress: () => {
            resetForm();
            onReplaced();
          },
        },
      ]);
    } catch (error) {
      const err = error as ApolloError;
      if (isTierError(err)) {
        // Every tier-error alert offers the path forward, matching add-bike.
        Alert.alert('Upgrade Required', getTierErrorMessage(err), [
          { text: 'OK', style: 'cancel' },
          {
            text: 'Upgrade',
            onPress: () => {
              onClose();
              router.push('/settings-detail/pricing' as Href);
            },
          },
        ]);
      } else {
        Alert.alert('Error', err.message);
      }
    }
  }, [
    component,
    activeTab,
    selectedSpareId,
    brand,
    model,
    note,
    installedAt,
    bikeId,
    installComponent,
    resetForm,
    onReplaced,
    onClose,
    router,
  ]);

  const canSubmit =
    (activeTab === 'spare' && selectedSpareId) ||
    (activeTab === 'new' && brand.trim() && model.trim());

  if (!component) return null;

  const typeName = formatComponentType(component.type);

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

              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>Replace {typeName}</Text>
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.closeButton}
                  accessibilityRole="button"
                  accessibilityLabel="Close replace component"
                >
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Tabs */}
              <View style={styles.tabs}>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'spare' && styles.tabActive]}
                  onPress={() => setActiveTab('spare')}
                  accessibilityRole="tab"
                  accessibilityLabel="Use a spare component"
                  accessibilityState={{ selected: activeTab === 'spare' }}
                >
                  <Text
                    style={[styles.tabText, activeTab === 'spare' && styles.tabTextActive]}
                  >
                    Use Spare
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'new' && styles.tabActive]}
                  onPress={() => setActiveTab('new')}
                  accessibilityRole="tab"
                  accessibilityLabel="Add a new component"
                  accessibilityState={{ selected: activeTab === 'new' }}
                >
                  <Text
                    style={[styles.tabText, activeTab === 'new' && styles.tabTextActive]}
                  >
                    New Component
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
                {activeTab === 'spare' ? (
                  matchingSpares.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Ionicons name="cube-outline" size={48} color={colors.textMuted} />
                      <Text style={styles.emptyText}>
                        No spare {typeName.toLowerCase()} components available
                      </Text>
                    </View>
                  ) : (
                    matchingSpares.map((spare) => {
                      const isSelected = selectedSpareId === spare.id;
                      const spareBrandModel = [spare.brand, spare.model]
                        .filter(Boolean)
                        .join(' ');

                      return (
                        <TouchableOpacity
                          key={spare.id}
                          style={[
                            styles.spareItem,
                            isSelected && styles.spareItemSelected,
                          ]}
                          onPress={() => setSelectedSpareId(spare.id)}
                          accessibilityRole="radio"
                          accessibilityLabel={spareBrandModel || 'Spare component'}
                          accessibilityState={{ selected: isSelected }}
                        >
                          <View style={styles.spareContent}>
                            <Text style={styles.spareBrand}>
                              {spareBrandModel || 'Unknown'}
                            </Text>
                            <Text style={styles.spareHours}>
                              {spare.hoursUsed?.toFixed(0) || 0}h used
                            </Text>
                          </View>
                          {isSelected && (
                            <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                          )}
                        </TouchableOpacity>
                      );
                    })
                  )
                ) : (
                  <View style={styles.form}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Brand *</Text>
                      <TextInput
                        style={styles.input}
                        value={brand}
                        onChangeText={setBrand}
                        placeholder="e.g., Fox"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Model *</Text>
                      <TextInput
                        style={styles.input}
                        value={model}
                        onChangeText={setModel}
                        placeholder="e.g., 36 Factory"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                  </View>
                )}

                {/* Install date */}
                <View style={styles.dateSection}>
                  <Text style={styles.inputLabel}>Installed on</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowDatePicker(!showDatePicker)}
                    accessibilityRole="button"
                    accessibilityLabel={`Install date: ${installedAt.toLocaleDateString()}. Change date.`}
                  >
                    <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                    <Text style={styles.dateButtonText}>
                      {installedAt.toDateString() === new Date().toDateString()
                        ? 'Today'
                        : installedAt.toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={installedAt}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'inline' : 'default'}
                      maximumDate={new Date()}
                      onChange={onDateChange}
                      themeVariant="dark"
                    />
                  )}
                </View>

                {/* Note Field */}
                <View style={styles.noteSection}>
                  <Text style={styles.inputLabel}>Note (optional)</Text>
                  <TextInput
                    style={[styles.input, styles.noteInput]}
                    value={note}
                    onChangeText={setNote}
                    placeholder="Why are you making this change?"
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={3}
                    maxLength={500}
                    textAlignVertical="top"
                  />
                </View>
              </ScrollView>

              {/* Footer */}
              <View style={styles.footer}>
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    (!canSubmit || loading) && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={!canSubmit || loading}
                  accessibilityRole="button"
                  accessibilityLabel="Replace component"
                  accessibilityState={{ disabled: !canSubmit || loading, busy: loading }}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.card} />
                  ) : (
                    <>
                      <Ionicons name="swap-horizontal" size={20} color={colors.card} />
                      <Text style={styles.submitButtonText}>Replace Component</Text>
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
    maxHeight: '85%',
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
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  tab: {
    minHeight: 44,
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 10,
    backgroundColor: colors.cardBorder,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.card,
  },
  content: {
    paddingHorizontal: 20,
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
  spareItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    marginBottom: 8,
  },
  spareItemSelected: {
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  spareContent: {
    flex: 1,
  },
  spareBrand: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  spareHours: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    color: colors.textPrimary,
  },
  dateSection: {
    marginTop: 20,
    gap: 6,
  },
  dateButton: {
    minHeight: 44,
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  dateButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.positiveOn,
  },
  noteSection: {
    marginTop: 20,
    gap: 6,
  },
  noteInput: {
    height: 80,
    paddingTop: 12,
  },
  footer: {
    padding: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
    marginTop: 8,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.full,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
