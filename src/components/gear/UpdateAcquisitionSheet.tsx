import { useEffect, useMemo, useState, useCallback } from 'react';
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
  Switch,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

import { useUpdateBikeAcquisitionMutation } from '../../graphql/generated';
import { colors } from '../../constants/theme';

interface UpdateAcquisitionSheetProps {
  visible: boolean;
  bikeId: string;
  bikeName: string;
  currentAcquisitionDate?: string | null;
  onClose: () => void;
}

export function UpdateAcquisitionSheet({
  visible,
  bikeId,
  bikeName,
  currentAcquisitionDate,
  onClose,
}: UpdateAcquisitionSheetProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [cascade, setCascade] = useState(true);
  const [result, setResult] = useState<{ installsMoved: number; serviceLogsMoved: number } | null>(
    null
  );

  const [updateAcquisition, { loading }] = useUpdateBikeAcquisitionMutation({
    refetchQueries: ['Gear', 'GearLight', 'BikeHistory'],
  });

  // Stable reference for the picker's maximum. A fresh `new Date()` per
  // render prop-invalidates the inline iOS picker on every state tick.
  // Sheet lifetime is short enough that midnight drift is irrelevant.
  const maxDate = useMemo(() => new Date(), []);

  useEffect(() => {
    if (visible) {
      // Seed with the current acquisitionDate if already set; otherwise today.
      // Matches the web modal's behavior so a user fixing a typo doesn't
      // have to retype the whole date.
      if (currentAcquisitionDate) {
        const parsed = new Date(currentAcquisitionDate);
        setDate(Number.isFinite(parsed.getTime()) ? parsed : new Date());
      } else {
        setDate(new Date());
      }
      setCascade(true);
      setResult(null);
      setShowDatePicker(false);
    }
  }, [visible, currentAcquisitionDate]);

  const onDateChange = useCallback((_event: DateTimePickerEvent, next?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (next) setDate(next);
  }, []);

  // Block every dismissal path (header X, overlay tap, Android back button,
  // Cancel) while the mutation is in flight. Otherwise a user can close
  // mid-flight: the request still lands but the success result is dropped,
  // and the sheet reopens with stale initial state.
  const handleClose = useCallback(() => {
    if (loading) return;
    onClose();
  }, [loading, onClose]);

  const handleConfirm = async () => {
    // Noon-anchor so the selected calendar date doesn't shift under
    // timezone conversion when round-tripped as an ISO string.
    const noon = new Date(date);
    noon.setHours(12, 0, 0, 0);
    try {
      const { data } = await updateAcquisition({
        variables: {
          bikeId,
          input: {
            acquisitionDate: noon.toISOString(),
            cascadeInstalls: cascade,
          },
        },
      });
      if (data?.updateBikeAcquisition) {
        setResult({
          installsMoved: data.updateBikeAcquisition.installsMoved,
          serviceLogsMoved: data.updateBikeAcquisition.serviceLogsMoved,
        });
      }
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              <View style={styles.handle} />

              <View style={styles.header}>
                <Text style={styles.title}>Update acquisition date</Text>
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.closeButton}
                  disabled={loading}
                >
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.subtitle}>{bikeName}</Text>

              {result ? (
                <View style={styles.body}>
                  <View style={styles.resultRow}>
                    <Ionicons name="checkmark-circle" size={24} color={colors.good} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultTitle}>
                        Moved {result.installsMoved} install date
                        {result.installsMoved === 1 ? '' : 's'}
                      </Text>
                      {result.serviceLogsMoved > 0 && (
                        <Text style={styles.resultSub}>
                          Baseline service anchors for {result.serviceLogsMoved} component
                          {result.serviceLogsMoved === 1 ? '' : 's'} moved alongside.
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.body}>
                  <Text style={styles.hint}>
                    Sets the acquisition date on this bike. If enabled below, also moves install
                    dates for every stock component (and any install auto-stamped when the bike
                    was added).
                  </Text>

                  <View style={styles.dateRow}>
                    <Text style={styles.dateLabel}>Acquired on</Text>
                    <TouchableOpacity
                      style={styles.dateButton}
                      onPress={() => setShowDatePicker(!showDatePicker)}
                    >
                      <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                      <Text style={styles.dateButtonText}>{date.toLocaleDateString()}</Text>
                    </TouchableOpacity>
                  </View>
                  {showDatePicker && (
                    <DateTimePicker
                      value={date}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'inline' : 'default'}
                      maximumDate={maxDate}
                      onChange={onDateChange}
                      themeVariant="dark"
                    />
                  )}

                  <View style={styles.cascadeRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cascadeLabel}>Also update stock install dates</Text>
                      <Text style={styles.cascadeHint}>
                        Post-creation swaps you've dated won't be touched.
                      </Text>
                    </View>
                    <Switch
                      value={cascade}
                      onValueChange={setCascade}
                      trackColor={{ false: colors.cardBorder, true: colors.primary }}
                    />
                  </View>
                </View>
              )}

              <View style={styles.footer}>
                {result ? (
                  <TouchableOpacity style={styles.saveButton} onPress={handleClose}>
                    <Text style={styles.saveButtonText}>Done</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={handleClose}
                      disabled={loading}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                      onPress={handleConfirm}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color={colors.textPrimary} />
                      ) : (
                        <Text style={styles.saveButtonText}>Update</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
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
  body: { paddingHorizontal: 20, paddingBottom: 12, gap: 14 },
  hint: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateLabel: { fontSize: 14, color: colors.textSecondary },
  dateButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primaryMuted, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  dateButtonText: { fontSize: 14, fontWeight: '500', color: colors.primary },
  cascadeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  cascadeLabel: { fontSize: 14, color: colors.textPrimary, fontWeight: '500' },
  cascadeHint: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  resultRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12, backgroundColor: colors.primaryMuted, borderRadius: 10 },
  resultTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  resultSub: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  footer: { flexDirection: 'row', gap: 12, padding: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.cardBorder },
  cancelButton: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder },
  cancelButtonText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  saveButton: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 10 },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
});
