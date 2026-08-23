import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

import {
  useUpdateServiceLogMutation,
  useDeleteServiceLogMutation,
} from '../../graphql/generated';
import { colors, radius } from '../../constants/theme';
import { BottomSheet } from '../common/BottomSheet';
import { KeyboardDoneAccessory } from '../common/KeyboardDoneAccessory';

/** Unique per surface: sibling screens stay mounted and would collide on a shared id. */
const DONE_ACCESSORY = 'edit-service-done';

export interface EditableServiceLog {
  id: string;
  performedAt: string;
  notes?: string | null;
  hoursAtService: number;
}

interface EditServiceSheetProps {
  visible: boolean;
  log: EditableServiceLog | null;
  componentLabel: string;
  onClose: () => void;
  onChanged?: () => void;
}

export function EditServiceSheet({
  visible,
  log,
  componentLabel,
  onClose,
  onChanged,
}: EditServiceSheetProps) {
  const [serviceDate, setServiceDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notes, setNotes] = useState('');
  // Blank by default so users don't have to clear a "0" before typing when
  // editing a zero-hours log. The "0" placeholder still hints at the
  // default, and `Number('')` coerces to 0 in handleSave so submitting
  // unchanged is a no-op.
  const [hours, setHours] = useState('');
  // True between "user taps Delete" and "user responds to the native Alert".
  // The mutation's `loading` flag doesn't cover this window — without the
  // guard, tapping Delete a second time before responding stacks a second
  // Alert on top of the first.
  const [confirming, setConfirming] = useState(false);

  const [updateServiceLog, { loading: updating }] = useUpdateServiceLogMutation({
    refetchQueries: ['BikeHistory', 'Gear', 'GearLight'],
  });
  const [deleteServiceLog, { loading: deleting }] = useDeleteServiceLogMutation({
    refetchQueries: ['BikeHistory', 'Gear', 'GearLight'],
  });
  const busy = updating || deleting || confirming;

  useEffect(() => {
    if (log) {
      const parsed = new Date(log.performedAt);
      setServiceDate(Number.isFinite(parsed.getTime()) ? parsed : new Date());
      setNotes(log.notes ?? '');
      // Show the actual value when non-zero; leave blank (with "0"
      // placeholder) when zero/null so tap-and-type doesn't require
      // manually clearing the field first.
      setHours(log.hoursAtService ? String(log.hoursAtService) : '');
      setShowDatePicker(false);
      setConfirming(false);
    }
  }, [log]);

  const onDateChange = useCallback((_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) setServiceDate(date);
  }, []);

  const handleSave = async () => {
    if (!log) return;
    const hoursNum = Number(hours);
    if (!Number.isFinite(hoursNum) || hoursNum < 0) {
      Alert.alert('Invalid hours', 'Hours must be a non-negative number.');
      return;
    }
    // Noon to prevent timezone shifts moving the date to the previous day.
    const noon = new Date(serviceDate);
    noon.setHours(12, 0, 0, 0);
    try {
      await updateServiceLog({
        variables: {
          id: log.id,
          input: {
            performedAt: noon.toISOString(),
            notes: notes.trim() || null,
            hoursAtService: hoursNum,
          },
        },
      });
      onChanged?.();
      onClose();
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    }
  };

  const handleDelete = () => {
    if (!log) return;
    setConfirming(true);
    Alert.alert(
      'Delete service?',
      'This service entry will be permanently removed.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setConfirming(false),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setConfirming(false);
            try {
              await deleteServiceLog({ variables: { id: log.id } });
              onChanged?.();
              onClose();
            } catch (err) {
              Alert.alert('Error', (err as Error).message);
            }
          },
        },
      ],
      // Back-button / swipe-dismiss on Android also clears the flag.
      { onDismiss: () => setConfirming(false) }
    );
  };

  const isToday = serviceDate.toDateString() === new Date().toDateString();

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeight="90%">
      <View style={styles.header}>
        <Text style={styles.title}>Edit Service</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>{componentLabel}</Text>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
      >
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

        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Hours at service</Text>
          <TextInput
            value={hours}
            onChangeText={setHours}
            keyboardType="decimal-pad"
            inputAccessoryViewID={DONE_ACCESSORY}
            style={styles.input}
            placeholder="0"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Notes</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            inputAccessoryViewID={DONE_ACCESSORY}
            style={[styles.input, styles.notesInput]}
            placeholder="Optional notes"
            placeholderTextColor={colors.textMuted}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} disabled={busy}>
          <Ionicons name="trash-outline" size={16} color={colors.criticalOn} />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveButton, busy && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardDoneAccessory nativeID={DONE_ACCESSORY} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 4 },
  title: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  closeButton: { padding: 4 },
  subtitle: { fontSize: 14, color: colors.textSecondary, paddingHorizontal: 20, paddingBottom: 12 },
  // flexShrink lets the field list give up height to the footer when the
  // keyboard shrinks the sheet, so Save and Delete stay reachable.
  body: { flexShrink: 1, maxHeight: 400 },
  bodyContent: { paddingHorizontal: 20, paddingBottom: 12, gap: 12 },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateLabel: { fontSize: 14, color: colors.textSecondary },
  dateButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primaryMuted, borderRadius: radius.sm, paddingVertical: 6, paddingHorizontal: 12 },
  dateButtonText: { fontSize: 14, fontWeight: '500', color: colors.positiveOn },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  fieldBlock: { gap: 6 },
  fieldLabel: { fontSize: 14, color: colors.textSecondary },
  input: { backgroundColor: colors.background, borderRadius: 8, borderWidth: 1, borderColor: colors.cardBorder, paddingVertical: 8, paddingHorizontal: 12, color: colors.textPrimary, fontSize: 14, minWidth: 100, textAlign: 'right' },
  notesInput: { textAlign: 'left', minHeight: 72, textAlignVertical: 'top' },
  footer: { flexDirection: 'row', gap: 12, padding: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.cardBorder },
  deleteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 16, borderRadius: radius.md, borderWidth: 1, borderColor: colors.criticalBorder },
  deleteButtonText: { color: colors.criticalOn, fontSize: 14, fontWeight: '600' },
  saveButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, paddingVertical: 12, borderRadius: radius.full },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
});
