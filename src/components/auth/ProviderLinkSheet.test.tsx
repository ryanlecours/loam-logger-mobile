import { render, screen, fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';
import { ProviderLinkSheet } from './ProviderLinkSheet';

/**
 * NOTE: in @testing-library/react-native v14 `render` is ASYNC and resolves to
 * void; queries come from the global `screen`.
 */

const mockComplete = jest.fn();
jest.mock('../../lib/auth', () => ({
  completeProviderLink: (...args: unknown[]) => mockComplete(...args),
}));

/** The sheet reads the bottom inset, so the provider needs real metrics. */
const METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const pending = { linkToken: 'link-t', email: 'rider@example.com', provider: 'apple' as const };

async function renderSheet() {
  const onLinked = jest.fn();
  const onClose = jest.fn();
  const onForgotPassword = jest.fn();
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <ProviderLinkSheet pending={pending} onClose={onClose} onLinked={onLinked} onForgotPassword={onForgotPassword} />
    </SafeAreaProvider>,
  );
  return { onLinked, onClose, onForgotPassword };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ProviderLinkSheet', () => {
  it('names the account and links with the password', async () => {
    mockComplete.mockResolvedValue({ success: true });
    const { onLinked } = await renderSheet();

    expect(screen.getByText(/rider@example.com already has a Loam Logger password/)).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Password'), 'right');
    await fireEvent.press(screen.getByLabelText('Connect Apple'));

    expect(mockComplete).toHaveBeenCalledWith('link-t', 'right');
    expect(onLinked).toHaveBeenCalledTimes(1);
  });

  it('keeps the sheet open and shows why on a wrong password', async () => {
    mockComplete.mockResolvedValue({ success: false, error: 'Incorrect password', errorCode: 'INVALID_CREDENTIALS' });
    const { onLinked } = await renderSheet();

    await fireEvent.changeText(screen.getByLabelText('Password'), 'wrong');
    await fireEvent.press(screen.getByLabelText('Connect Apple'));

    expect(await screen.findByText('Incorrect password')).toBeTruthy();
    expect(onLinked).not.toHaveBeenCalled();
  });

  it('closes and hands off to forgot-password', async () => {
    const { onClose, onForgotPassword } = await renderSheet();

    await fireEvent.press(screen.getByText('Forgot password?'));

    expect(onClose).toHaveBeenCalled();
    expect(onForgotPassword).toHaveBeenCalled();
  });
});
