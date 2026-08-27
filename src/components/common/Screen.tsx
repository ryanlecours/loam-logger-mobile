import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { colors } from '../../constants/theme';

/**
 * Root element for any screen the navigator renders without a native header.
 *
 * Most of this app's stacks are declared `headerShown: false`, and on Android
 * `edgeToEdgeEnabled` is on, so nothing above a screen reserves the status
 * bar, the notch, or the home indicator. A plain `<View style={{flex: 1}}>`
 * root therefore puts its first pixel at the display's first pixel, and the
 * screen's title ends up behind the clock and the battery icon. Screens used
 * to work around this with a hard-coded `marginTop: 76` on whatever element
 * happened to be first, which is a guess at one device's inset: wrong on
 * every other device, and silently absent whenever the first element changed.
 *
 * Wrap the screen in this instead. The inset is read from the OS and is
 * ADDITIVE with whatever padding the caller declares, so
 * `<Screen style={{ paddingTop: 16 }}>` keeps its 16pt of design spacing and
 * gains the device inset underneath it. Style padding stays a design decision;
 * the inset stays a device fact.
 *
 * `edges` defaults to top and bottom, which is what a full-bleed screen wants.
 * Pass a narrower set when something else already owns an edge:
 *   - `['top']` inside the tab navigator, where the tab bar covers the bottom.
 *   - `['top']` when a `KeyboardAvoidingView` sits directly inside and the
 *     reserved bottom inset would float content above the open keyboard.
 * Left and right are available but rarely needed: the app is portrait-locked
 * (`orientation: "portrait"` in app.json), so horizontal insets are 0.
 *
 * Percentage padding is not supported by the underlying native view. Use
 * numbers.
 */

const DEFAULT_EDGES: readonly Edge[] = ['top', 'bottom'];

interface ScreenProps {
  children: ReactNode;
  /** Which device insets to reserve. Defaults to top and bottom. */
  edges?: readonly Edge[];
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Screen({ children, edges = DEFAULT_EDGES, style, testID }: ScreenProps) {
  return (
    <SafeAreaView style={[styles.screen, style]} edges={edges} testID={testID}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
