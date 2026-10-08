import { render, screen, fireEvent } from '@testing-library/react-native';
import { EmailVerificationBanner } from './EmailVerificationBanner';

/**
 * NOTE: in @testing-library/react-native v14 `render` is ASYNC and resolves to
 * void; queries come from the global `screen`.
 */

const mockUseQuery = jest.fn();
const mockRefetch = jest.fn().mockResolvedValue({});
const mockResend = jest.fn();

jest.mock('../../graphql/generated', () => ({
  useEmailVerificationStatusQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

jest.mock('../../api/emailVerification', () => ({
  resendVerificationEmail: () => mockResend(),
}));

function viewer(needsEmailVerification: boolean) {
  mockUseQuery.mockReturnValue({
    data: { me: { id: 'u1', email: 'rider@example.com', needsEmailVerification } },
    refetch: mockRefetch,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('EmailVerificationBanner', () => {
  it('stays hidden for a confirmed or older account', async () => {
    viewer(false);
    await render(<EmailVerificationBanner />);
    expect(screen.queryByText('Confirm your email')).toBeNull();
  });

  // An API from before the field existed answers with an error and no data.
  it('stays hidden when the status query fails', async () => {
    mockUseQuery.mockReturnValue({ data: undefined, error: new Error('Cannot query field'), refetch: mockRefetch });
    await render(<EmailVerificationBanner />);
    expect(screen.queryByText('Confirm your email')).toBeNull();
  });

  it('says where the link went and resends on request', async () => {
    viewer(true);
    mockResend.mockResolvedValue({ alreadyVerified: false });
    await render(<EmailVerificationBanner />);

    expect(screen.getByText(/rider@example.com/)).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Resend confirmation email'));

    expect(mockResend).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/Sent to rider@example.com/)).toBeTruthy();
  });

  it('rechecks instead of claiming a send when the address is already confirmed', async () => {
    viewer(true);
    mockResend.mockResolvedValue({ alreadyVerified: true });
    await render(<EmailVerificationBanner />);

    await fireEvent.press(screen.getByLabelText('Resend confirmation email'));

    expect(mockRefetch).toHaveBeenCalled();
    expect(screen.queryByText(/Sent to/)).toBeNull();
  });

  it('shows the server message when the resend is refused', async () => {
    viewer(true);
    mockResend.mockRejectedValue(new Error('Too many verification emails.'));
    await render(<EmailVerificationBanner />);

    await fireEvent.press(screen.getByLabelText('Resend confirmation email'));

    expect(await screen.findByText('Too many verification emails.')).toBeTruthy();
  });
});
