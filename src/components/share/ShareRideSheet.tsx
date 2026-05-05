import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { RideShareCard, type RideShareCardProps } from './RideShareCard';

/**
 * Bottom sheet that lets the user pick which stats to include in the
 * share overlay before it's captured. Renders an inline preview of the
 * actual share card on top so toggling a field gives immediate visual
 * feedback — what they see is what they get.
 *
 * Selection state lives here (not in the parent hook) so dismiss/cancel
 * cleanly resets without the parent having to track per-snapshot state.
 * On `visible` flipping true the selection is initialized from
 * `defaultSelection` — which the consumer derives from the snapshot
 * (e.g. `averageHr === null` → HR field unselectable, all others on).
 *
 * Field order in the toggle list matches the share card's stats row, so
 * the user's mental mapping between checkbox and rendered icon is direct.
 */

export type ShareFieldKey = 'distance' | 'elevation' | 'duration' | 'averageHr';
export type ShareFieldSelection = Record<ShareFieldKey, boolean>;

interface ShareRideSheetProps {
  visible: boolean;
  onClose: () => void;
  /** All formatted values for the snapshot. Null = the data isn't available
   *  for this ride/timeframe and the corresponding toggle is disabled. */
  values: RideShareCardProps;
  /** Called when the user confirms. Selected fields are passed through
   *  with their values; deselected fields are omitted. The parent then
   *  feeds these props to the off-screen RideShareCard for capture. */
  onConfirm: (selectedValues: RideShareCardProps) => void;
  /** True while the capture+share pipeline is running, after the user
   *  confirmed. Spinner replaces the Share CTA so the sheet doesn't
   *  appear unresponsive between confirm and the OS share sheet. */
  sharing: boolean;
}

const FIELD_LABELS: Record<ShareFieldKey, string> = {
  distance: 'Distance',
  elevation: 'Elevation gain',
  duration: 'Duration',
  averageHr: 'Average heart rate',
};

const FIELD_ICONS: Record<ShareFieldKey, keyof typeof Ionicons.glyphMap> = {
  distance: 'navigate-outline',
  elevation: 'trending-up-outline',
  duration: 'time-outline',
  averageHr: 'heart-outline',
};

const FIELD_ORDER: ShareFieldKey[] = ['distance', 'elevation', 'duration', 'averageHr'];

export function ShareRideSheet({ visible, onClose, values, onConfirm, sharing }: ShareRideSheetProps) {
  // Default selection: every field that has data is checked. A field with
  // null data (e.g. averageHr on a ride without a HR sensor) is unchecked
  // AND disabled — the user can't toggle it on because there's nothing
  // to render.
  const initialSelection = useMemo<ShareFieldSelection>(
    () => ({
      distance: values.distance != null,
      elevation: values.elevation != null,
      duration: values.duration != null,
      averageHr: values.averageHr != null,
    }),
    [values],
  );

  const [selection, setSelection] = useState<ShareFieldSelection>(initialSelection);

  // Reset on each open so a previous session's deselection doesn't carry
  // over to a new snapshot. Keyed on `visible` (not `values`) — opening
  // the sheet for the same ride twice should re-default to all-on.
  useEffect(() => {
    if (visible) setSelection(initialSelection);
  }, [visible, initialSelection]);

  const previewProps: RideShareCardProps = useMemo(
    () => ({
      distance: selection.distance ? values.distance : null,
      elevation: selection.elevation ? values.elevation : null,
      duration: selection.duration ? values.duration : null,
      averageHr: selection.averageHr ? values.averageHr : null,
    }),
    [selection, values],
  );

  const anySelected = FIELD_ORDER.some((k) => selection[k]);

  const toggle = (key: ShareFieldKey) => {
    if (values[key] == null) return; // disabled
    setSelection((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleConfirm = () => {
    onConfirm(previewProps);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              <View style={styles.handle} />

              <Text style={styles.title}>Share ride</Text>
              <Text style={styles.subtitle}>Choose which stats to include.</Text>

              {/* Live preview — sits on a checkered/dark backdrop so the
                  white text and transparent background are both visible.
                  This is just a UX preview; the actual capture happens
                  off-screen via useShareRideOverlay's ShareSurface. */}
              <View style={styles.previewBackdrop}>
                <View style={styles.previewScale}>
                  <RideShareCard {...previewProps} />
                </View>
              </View>

              {/* Toggle list */}
              <View style={styles.toggles}>
                {FIELD_ORDER.map((key) => {
                  const disabled = values[key] == null;
                  const checked = selection[key];
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[styles.toggleRow, disabled && styles.toggleRowDisabled]}
                      onPress={() => toggle(key)}
                      disabled={disabled || sharing}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={FIELD_ICONS[key]}
                        size={20}
                        color={disabled ? colors.textMuted : colors.textSecondary}
                      />
                      <View style={styles.toggleLabelColumn}>
                        <Text style={[styles.toggleLabel, disabled && styles.toggleLabelDisabled]}>
                          {FIELD_LABELS[key]}
                        </Text>
                        {disabled ? (
                          <Text style={styles.toggleHint}>Not available for this ride</Text>
                        ) : (
                          <Text style={styles.toggleValue} numberOfLines={1}>
                            {values[key]}
                          </Text>
                        )}
                      </View>
                      <View
                        style={[
                          styles.checkbox,
                          checked && !disabled && styles.checkboxChecked,
                          disabled && styles.checkboxDisabled,
                        ]}
                      >
                        {checked && !disabled && (
                          <Ionicons name="checkmark" size={16} color="#fff" />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Action row */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onClose}
                  disabled={sharing}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.shareButton,
                    (!anySelected || sharing) && styles.shareButtonDisabled,
                  ]}
                  onPress={handleConfirm}
                  // Don't let users export an empty card — the rule is
                  // "logo + at least one stat". Logo-only would technically
                  // work but feels like an accidental share.
                  disabled={!anySelected || sharing}
                >
                  {sharing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="share-outline" size={18} color="#fff" />
                      <Text style={styles.shareButtonText}>Share</Text>
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
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    backgroundColor: colors.cardBorder,
    borderRadius: 2,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  previewBackdrop: {
    backgroundColor: '#000', // contrast for the white text/icons
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 16,
  },
  previewScale: {
    // The card itself is 720pt wide for crisp PNG output. Shrink visually
    // for the in-sheet preview without changing the layout the capture
    // will use — `transform: scale` keeps the same children, same hooks,
    // same behavior; only the painted size changes.
    transform: [{ scale: 0.45 }],
    // Negative margins compensate for the empty space `transform: scale`
    // leaves behind around the unscaled bounding box.
    marginVertical: -60,
  },
  toggles: {
    gap: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  toggleRowDisabled: {
    opacity: 0.5,
  },
  toggleLabelColumn: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  toggleLabelDisabled: {
    color: colors.textMuted,
  },
  toggleValue: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  toggleHint: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxDisabled: {
    borderColor: colors.cardBorder,
    backgroundColor: 'transparent',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  shareButtonDisabled: {
    opacity: 0.5,
  },
  shareButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
