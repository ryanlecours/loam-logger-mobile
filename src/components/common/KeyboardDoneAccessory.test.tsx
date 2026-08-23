import { Keyboard } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';

import { KeyboardDoneAccessory } from './KeyboardDoneAccessory';

/**
 * This bar is the only way out of an iOS `number-pad`, which ships no return
 * key at all. If the Done control ever stops dismissing, snoozing an alert
 * becomes a dead end again.
 *
 * These run under jest-expo's iOS platform; the component renders nothing on
 * Android by design, where the system back gesture already does the job.
 */
describe('KeyboardDoneAccessory', () => {
  it('dismisses the keyboard when Done is pressed', async () => {
    const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
    await render(<KeyboardDoneAccessory nativeID="test-accessory" />);

    fireEvent.press(screen.getByLabelText('Done editing'));

    expect(dismiss).toHaveBeenCalledTimes(1);
    dismiss.mockRestore();
  });
});
