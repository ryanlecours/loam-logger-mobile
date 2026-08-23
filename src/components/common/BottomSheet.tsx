import { type ReactNode } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  type DimensionValue,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, space } from '../../constants/theme';
import { useKeyboardVisible } from '../../hooks/useKeyboardVisible';

interface BottomSheetProps {
  visible: boolean;
  /** Fires on scrim tap, Android back, and whatever the sheet's own close control calls. */
  onClose: () => void;
  children: ReactNode;
  /**
   * How much of the available height the sheet may occupy. Measured against
   * the space left over once the keyboard is accounted for, so a sheet with a
   * focused field stays fully on screen rather than sliding under the keypad.
   */
  maxHeight?: DimensionValue;
  /** Set false for sheets that render their own grabber. */
  showHandle?: boolean;
}

/**
 * The shared bottom-sheet shell: scrim, slide-up card, drag handle, safe-area
 * padding, and keyboard avoidance.
 *
 * Every sheet in the app used to hand-roll this scaffold, which meant none of
 * them avoided the keyboard. A sheet is bottom-anchored by definition, so the
 * keypad rises into exactly the band holding the inputs and the action footer;
 * an inner ScrollView cannot rescue a footer that is its sibling. Wrapping the
 * whole thing in KeyboardAvoidingView lifts card and footer together.
 *
 * Content is laid out as direct children. Put scrolling content in a ScrollView
 * with `keyboardShouldPersistTaps="handled"` and leave action rows outside it;
 * both ride up together.
 */
export function BottomSheet({
  visible,
  onClose,
  children,
  maxHeight = '85%',
  showHandle = true,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();

  // A scrim tap while a field is focused means "I'm done typing", not "throw
  // this away". iOS numeric keypads have no return key, so for those fields
  // this is the only dismissal gesture there is.
  const handleScrimPress = () => {
    if (keyboardVisible) {
      Keyboard.dismiss();
      return;
    }
    onClose();
  };

  // The safe-area inset covers the home indicator. With the keyboard up the
  // keypad already occupies that strip, so reserving it again just opens a gap.
  const paddingBottom = keyboardVisible ? space.xl : Math.max(insets.bottom, space.xl);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.avoider}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={handleScrimPress} accessible={false}>
          <View style={styles.scrim} testID="bottom-sheet-scrim">
            <TouchableWithoutFeedback accessible={false}>
              <View accessibilityViewIsModal style={[styles.sheet, { maxHeight, paddingBottom }]}>
                {showHandle && <View style={styles.handle} />}
                {children}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  avoider: {
    flex: 1,
  },
  scrim: {
    flex: 1,
    // Carried over verbatim from the sheets this replaces. `colors.scrim` is
    // the DESIGN.md-sanctioned forest-tinted value and this should move onto
    // it, but that is a visual decision, not part of a keyboard fix.
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    // 20 is off the radius scale (`lg` is 16, `xl` is 24) but is what every
    // sheet already shipped. Kept so this extraction changes no pixels.
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.cardBorder,
    borderRadius: radius.full,
    alignSelf: 'center',
    marginTop: space.md,
    marginBottom: space.md,
  },
});
