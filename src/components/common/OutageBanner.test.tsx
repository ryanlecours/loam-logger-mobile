import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';

import { useFeatureFlagWithPayload } from 'posthog-react-native';
import { useIsOnline } from '../../lib/connectivity';
import { DEFAULT_OUTAGE_MESSAGE, OutageBanner, readOutageMessage } from './OutageBanner';

jest.mock('posthog-react-native', () => ({
  useFeatureFlagWithPayload: jest.fn(),
}));

jest.mock('../../lib/posthog', () => ({
  posthog: { reloadFeatureFlagsAsync: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('../../lib/connectivity', () => ({
  useIsOnline: jest.fn(() => true),
}));

const mockFlag = useFeatureFlagWithPayload as jest.Mock;
const mockOnline = useIsOnline as jest.Mock;

/** A notched phone: status bar above, home indicator below. */
const METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

async function renderBanner() {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <OutageBanner />
    </SafeAreaProvider>,
  );
}

function paddingTopOf(testID: string): number | undefined {
  const style = screen.getByTestId(testID).props.style;
  const flat = Array.isArray(style) ? Object.assign({}, ...style.flat()) : style;
  return flat.paddingTop;
}

describe('readOutageMessage', () => {
  it('is null while the flag is off or unknown', () => {
    expect(readOutageMessage(false, { message: 'ignored' })).toBeNull();
    expect(readOutageMessage(undefined, { message: 'ignored' })).toBeNull();
  });

  it('reads an object or string payload', () => {
    expect(readOutageMessage(true, { message: 'Sync is delayed.' })).toBe('Sync is delayed.');
    expect(readOutageMessage(true, 'Back shortly.')).toBe('Back shortly.');
  });

  it('falls back to the default copy when the payload is missing or blank', () => {
    expect(readOutageMessage(true, undefined)).toBe(DEFAULT_OUTAGE_MESSAGE);
    expect(readOutageMessage(true, {})).toBe(DEFAULT_OUTAGE_MESSAGE);
    expect(readOutageMessage(true, { message: '  ' })).toBe(DEFAULT_OUTAGE_MESSAGE);
  });
});

describe('OutageBanner', () => {
  beforeEach(() => {
    mockFlag.mockReturnValue([undefined, undefined]);
    mockOnline.mockReturnValue(true);
  });

  it('renders nothing while the flag is off', async () => {
    mockFlag.mockReturnValue([false, undefined]);
    await renderBanner();
    expect(screen.queryByTestId('outage-banner')).toBeNull();
  });

  it('shows the payload message as an alert when the flag is on', async () => {
    mockFlag.mockReturnValue([true, { message: 'Database maintenance until 3pm ET.' }]);
    await renderBanner();

    expect(screen.getByTestId('outage-banner').props.accessibilityRole).toBe('alert');
    expect(screen.getByText('Database maintenance until 3pm ET.')).toBeTruthy();
  });

  it('reserves the status bar inset while online', async () => {
    mockFlag.mockReturnValue([true, undefined]);
    await renderBanner();
    expect(paddingTopOf('outage-banner')).toBe(47 + 8);
  });

  it('leaves the inset to the offline strip while offline', async () => {
    mockFlag.mockReturnValue([true, undefined]);
    mockOnline.mockReturnValue(false);
    await renderBanner();
    expect(paddingTopOf('outage-banner')).toBe(8);
  });
});
