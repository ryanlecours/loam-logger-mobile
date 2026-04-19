import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

import {
  useUpdateBikeComponentInstallMutation,
  useDeleteBikeComponentInstallMutation,
} from '../../graphql/generated';
import { colors } from '../../constants/theme';

export interface EditableInstallEvent {
  /** Composite id from BikeHistory (e.g. "abc:installed" or "abc:removed"). */
  id: string;
  eventType: 'INSTALLED' | 'REMOVED';
  occurredAt: string;
}

interface EditInstallSheetProps {
  visible: boolean;
  event: EditableInstallEvent | null;
  componentLabel: string;
  /**
   * True when the underlying BikeComponentInstall row has BOTH installedAt
   * and removedAt. Controls whether the delete alert copy says "both events"
   * or just "this install event."
   */
  hasPairedEvent?: boolean;
  onClose: () => void;
}

function baseInstallId(compositeId: string): string {
  const idx = compositeId.lastIndexOf(':');
  return idx > 0 ? compositeId.slice(0, idx) : compositeId;
}

export function EditInstallSheet({
  visible,
  event,
  componentLabel,
  hasPairedEvent = false,
  onClose,
}: EditInstallSheetProps) {
  const [eventDate, setEventDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [updateInstall, { loading: updating }] = useUpdateBikeComponentInstallMutation({
    refetchQueries: ['BikeHistory', 'Gear', 'GearLight'],
  });
  const [deleteInstall, { loading: deleting }] = useDeleteBikeComponentInstallMutation({
    refetchQueries: ['BikeHistory', 'Gear', 'GearLight'],
  });
  const busy = updating || deleting;

  useEffect(() => {
    if (event) {
      const parsed = new Date(event.occurredAt);
      setEventDate(Number.isFinite(parsed.getTime()) ? parsed : new Date());
      setShowDatePicker(false);
    }
  }, [event]);

  const onDateChange = useCallback((_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) setEventDate(date);
  }, []);

  if (!event) return null;

  const isInstallEvent = event.eventType === 'INSTALLED';
  const fieldLabel = isInstallEvent ? 'Install date' : 'Removal date';

  const handleSave = async () => {
    // Noon to prevent timezone shifts moving the date to the previous day.
    const noon = new Date(eventDate);
    noon.setHours(12, 0, 0, 0);
    const iso = noon.toISOString();
    const input = isInstallEvent ? { installedAt: iso } : { removedAt: iso };
    try {
      await updateInstall({ variables: { id: baseInstallId(event.id), input } });
      onClose();
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      hasPairedEvent ? 'Delete install and removal events?' : 'Delete install event?',
      hasPairedEvent
        ? 'This removes both the install and removal events for this component.'
        : 'This removes the install record for this component.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteInstall({ variables: { id: baseInstallId(event.id) } });
              onClose();
            } catch (err) {
              Alert.alert('Error', (err as Error).message);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              <View style={styles.handle} />

              <View style={styles.header}>
                <Text style={styles.title}>
                  {isInstallEvent ? 'Edit Install' : 'Edit Removal'}
                </Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.subtitle}>{componentLabel}</Text>

              <View style={styles.body}>
                <View style={styles.dateRow}>
                  <Text style={styles.dateLabel}>{fieldLabel}</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowDatePicker(!showDatePicker)}
                  >
                    <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                    <Text style={styles.dateButtonText}>{eventDate.toLocaleDateString()}</Text>
                  </TouchableOpacity>
                </View>
                {showDatePicker && (
                  <DateTimePicker
                    value={eventDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    maximumDate={new Date()}
                    onChange={onDateChange}
                    themeVariant="dark"
                  />
                )}
              </View>

              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={handleDelete}
                  disabled={busy}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, busy && styles.saveButtonDisabled]}
                  onPress={handleSave}
                  disabled={busy}
                >
                  {busy ? (
                    <ActivityIndicator color={colors.textPrimary} />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
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
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 24, maxHeight: '85%' },
  handle: { width: 36, height: 4, backgroundColor: colors.cardBorder, borderRadius: 2, alignSelf: 'center', marginTop: 8, marginBottom: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 4 },
  title: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  closeButton: { padding: 4 },
  subtitle: { fontSize: 14, color: colors.textSecondary, paddingHorizontal: 20, paddingBottom: 12 },
  body: { paddingHorizontal: 20, paddingBottom: 12 },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateLabel: { fontSize: 14, color: colors.textSecondary },
  dateButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primaryMuted, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  dateButtonText: { fontSize: 14, fontWeight: '500', color: colors.primary },
  footer: { flexDirection: 'row', gap: 12, padding: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.cardBorder },
  deleteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: colors.danger },
  deleteButtonText: { color: colors.danger, fontSize: 14, fontWeight: '600' },
  saveButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 10 },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
});
