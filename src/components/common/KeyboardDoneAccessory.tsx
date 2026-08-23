import {
  View,
  Text,
  StyleSheet,
  InputAccessoryView,
  TouchableOpacity,
  Keyboard,
  Platform,
} from 'react-native';

import { colors, radius, space, type } from '../../constants/theme';

interface KeyboardDoneAccessoryProps {
  /**
   * Must match the `inputAccessoryViewID` on the fields it serves, and must be
   * unique across everything mounted at once. Screens stay mounted underneath
   * a pushed route, so give every surface its own constant rather than sharing
   * one app-wide id.
   */
  nativeID: string;
}

/**
 * A "Done" bar above the keyboard, for fields that have no other way out.
 *
 * iOS renders `number-pad` and `decimal-pad` as a bare 10-key with no return
 * key at all, so `returnKeyType="done"` on those fields is silently a no-op.
 * Multiline fields have a return key, but it inserts a newline. In both cases
 * the only escape is tapping somewhere else, which inside a sheet hits the
 * scrim and used to discard the entry.
 *
 * Android needs none of this: the system back gesture dismisses the keyboard
 * and `InputAccessoryView` is iOS-only, so this renders nothing there.
 */
export function KeyboardDoneAccessory({ nativeID }: KeyboardDoneAccessoryProps) {
  if (Platform.OS !== 'ios') return null;

  return (
    <InputAccessoryView nativeID={nativeID}>
      <View style={styles.bar}>
        <TouchableOpacity
          onPress={() => Keyboard.dismiss()}
          style={styles.button}
          accessibilityRole="button"
          accessibilityLabel="Done editing"
          hitSlop={8}
        >
          <Text style={styles.label}>Done</Text>
        </TouchableOpacity>
      </View>
    </InputAccessoryView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
  },
  button: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    borderRadius: radius.full,
  },
  label: {
    ...type.bodyStrong,
    color: colors.primary,
  },
});
