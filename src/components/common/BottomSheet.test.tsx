import { type ReactNode } from 'react';
import { Text, Keyboard, type EmitterSubscription } from 'react-native';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';

import { BottomSheet } from './BottomSheet';

/**
 * The behaviour worth pinning down is the scrim tap. A sheet is bottom-
 * anchored, so a focused field puts the keyboard right on top of it, and
 * tapping away is the only exit iOS gives a `number-pad`. If that tap closed
 * the sheet it would also discard whatever was typed, which is the bug this
 * component exists to fix.
 *
 * `Keyboard` has no public emit, so the listeners `useKeyboardVisible`
 * registers are captured through a spy and invoked by hand.
 *
 * `render` is async in @testing-library/react-native v14; queries come from
 * the global `screen`.
 */

const SCRIM = 'bottom-sheet-scrim';

/** The sheet reads the bottom inset, so the provider needs real metrics. */
const METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function renderSheet(ui: ReactNode) {
  return render(<SafeAreaProvider initialMetrics={METRICS}>{ui}</SafeAreaProvider>);
}

let handlers: Record<string, Array<() => void>>;

async function emitKeyboard(event: string) {
  // React 19 renders concurrently, so the state update has to be flushed with
  // an awaited act before the scrim's press handler sees it.
  await act(async () => {
    (handlers[event] ?? []).forEach((fn) => fn());
  });
}

beforeEach(() => {
  handlers = {};
  jest.spyOn(Keyboard, 'addListener').mockImplementation((event, listener) => {
    (handlers[event] ??= []).push(listener as () => void);
    // Only `remove` is ever called on the subscription; the rest of
    // EmitterSubscription is native bookkeeping this stub has no use for.
    return { remove: () => {} } as unknown as EmitterSubscription;
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

/** Both platforms' events, so the assertions do not depend on Platform.OS. */
async function showKeyboard() {
  await emitKeyboard('keyboardWillShow');
  await emitKeyboard('keyboardDidShow');
}

async function hideKeyboard() {
  await emitKeyboard('keyboardWillHide');
  await emitKeyboard('keyboardDidHide');
}

describe('BottomSheet', () => {
  it('renders its children while visible', async () => {
    await renderSheet(
      <BottomSheet visible onClose={jest.fn()}>
        <Text>Edit Service</Text>
      </BottomSheet>
    );

    expect(screen.getByText('Edit Service')).toBeTruthy();
  });

  it('closes on a scrim tap when no keyboard is up', async () => {
    const onClose = jest.fn();
    await renderSheet(
      <BottomSheet visible onClose={onClose}>
        <Text>Edit Service</Text>
      </BottomSheet>
    );

    fireEvent.press(screen.getByTestId(SCRIM));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('dismisses the keyboard instead of closing while a field is focused', async () => {
    const onClose = jest.fn();
    const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
    await renderSheet(
      <BottomSheet visible onClose={onClose}>
        <Text>Edit Service</Text>
      </BottomSheet>
    );

    await showKeyboard();
    fireEvent.press(screen.getByTestId(SCRIM));

    expect(dismiss).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes again once the keyboard has gone away', async () => {
    const onClose = jest.fn();
    const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
    await renderSheet(
      <BottomSheet visible onClose={onClose}>
        <Text>Edit Service</Text>
      </BottomSheet>
    );

    await showKeyboard();
    await hideKeyboard();
    fireEvent.press(screen.getByTestId(SCRIM));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(dismiss).not.toHaveBeenCalled();
  });
});
