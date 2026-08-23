import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Tracks whether the software keyboard is currently on screen.
 *
 * iOS gets the `will` events so callers react on the same frame the keyboard
 * starts animating; Android only emits `did`, so it uses those.
 *
 * The one caller that matters is `BottomSheet`: a tap on the scrim has to mean
 * "put the keyboard away" while a field is focused and "close the sheet"
 * otherwise. Without that distinction, the only gesture available for
 * dismissing a numeric keypad also throws away whatever was typed.
 */
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return visible;
}
