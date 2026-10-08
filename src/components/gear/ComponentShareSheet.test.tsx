import { Alert, Share } from 'react-native';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';

import { ComponentShareSheet } from './ComponentShareSheet';
import { ComponentShareScope } from '../../graphql/generated';
import { rangeEndIso, rangeStartIso } from '../../utils/componentShare';

/**
 * What matters here is what the sheet asks the API for: a live scope sends no
 * dates, a range sends [start, end) with the last day included, and revoking
 * only happens after the rider confirms. The generated hooks are mocked, so
 * no Apollo client is needed.
 */

const mockCreateShare = jest.fn();
const mockRevokeShare = jest.fn();
let mockShares: Array<Record<string, unknown>> = [];

jest.mock('../../graphql/generated', () => ({
  ...jest.requireActual('../../graphql/generated'),
  useComponentSharesQuery: () => ({ data: { component: { id: 'c1', shares: mockShares } }, loading: false }),
  useCreateComponentShareMutation: () => [mockCreateShare, { loading: false }],
  useRevokeComponentShareMutation: () => [mockRevokeShare, { loading: false }],
}));

const METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const EARLIEST = new Date(2026, 0, 10, 14);

function sheet(earliestDay: Date = EARLIEST) {
  return (
    <SafeAreaProvider initialMetrics={METRICS}>
      <ComponentShareSheet visible componentId="c1" earliestDay={earliestDay} onClose={jest.fn()} />
    </SafeAreaProvider>
  );
}

function renderSheet(earliestDay?: Date) {
  return render(sheet(earliestDay));
}

beforeEach(() => {
  mockShares = [];
  mockCreateShare.mockReset().mockResolvedValue({
    data: { createComponentShare: { url: 'https://loamlogger.app/c/abc' } },
  });
  mockRevokeShare.mockReset().mockResolvedValue({ data: { revokeComponentShare: true } });
  jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
});

afterEach(() => jest.restoreAllMocks());

it('creates a lifetime link without dates and opens the share sheet', async () => {
  await renderSheet();
  await fireEvent.press(screen.getByText('Create and share link'));

  expect(mockCreateShare).toHaveBeenCalledWith({
    variables: { input: { componentId: 'c1', scope: ComponentShareScope.Lifetime } },
  });
  expect(Share.share).toHaveBeenCalledWith({ message: 'https://loamlogger.app/c/abc' });
});

it('sends a date range as [first install, the day after today)', async () => {
  await renderSheet();
  await fireEvent.press(screen.getByText('Date range'));
  await fireEvent.press(screen.getByText('Create and share link'));

  expect(mockCreateShare).toHaveBeenCalledWith({
    variables: {
      input: {
        componentId: 'c1',
        scope: ComponentShareScope.Range,
        rangeStart: rangeStartIso(EARLIEST),
        rangeEnd: rangeEndIso(new Date()),
      },
    },
  });
});

it('revokes a link only after the rider confirms', async () => {
  mockShares = [
    {
      id: 's1',
      scope: ComponentShareScope.SinceService,
      rangeStart: null,
      rangeEnd: null,
      url: 'https://loamlogger.app/c/s1',
      createdAt: new Date(2026, 5, 1).toISOString(),
    },
  ];
  const alert = jest.spyOn(Alert, 'alert');
  await renderSheet();

  await fireEvent.press(screen.getByLabelText('Revoke the Since last service link'));
  expect(mockRevokeShare).not.toHaveBeenCalled();

  const buttons = alert.mock.calls[0][2] ?? [];
  const confirm = buttons.find((b) => b.style === 'destructive');
  await act(async () => {
    await confirm?.onPress?.();
  });
  expect(mockRevokeShare).toHaveBeenCalledWith({ variables: { id: 's1' } });
});

// The history refetches while the sheet can be open. A start picked before a
// later install date would silently disable Create, so the start follows it.
it('never starts a range before the install, even if it moves later while open', async () => {
  const later = new Date(2026, 2, 5, 9);
  const view = await renderSheet();
  await fireEvent.press(screen.getByText('Date range'));
  await view.rerender(sheet(later));
  await fireEvent.press(screen.getByText('Create and share link'));

  expect(mockCreateShare).toHaveBeenCalledWith({
    variables: {
      input: {
        componentId: 'c1',
        scope: ComponentShareScope.Range,
        rangeStart: rangeStartIso(later),
        rangeEnd: rangeEndIso(new Date()),
      },
    },
  });
});

it('says why Create is off when no valid range exists', async () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  await renderSheet(tomorrow);
  await fireEvent.press(screen.getByText('Date range'));

  expect(screen.getByText(/Pick dates between/)).toBeTruthy();
  await fireEvent.press(screen.getByText('Create and share link'));
  expect(mockCreateShare).not.toHaveBeenCalled();
});

it('names a failed revoke as a revoke, not a save', async () => {
  mockShares = [
    {
      id: 's1',
      scope: ComponentShareScope.Lifetime,
      rangeStart: null,
      rangeEnd: null,
      url: 'https://loamlogger.app/c/s1',
      createdAt: new Date(2026, 5, 1).toISOString(),
    },
  ];
  mockRevokeShare.mockRejectedValue(new Error('Network request failed'));
  const alert = jest.spyOn(Alert, 'alert');
  await renderSheet();

  await fireEvent.press(screen.getByLabelText('Revoke the Lifetime link'));
  const confirm = (alert.mock.calls[0][2] ?? []).find((b) => b.style === 'destructive');
  await act(async () => {
    await confirm?.onPress?.();
  });

  expect(alert).toHaveBeenLastCalledWith(
    "Couldn't revoke the link",
    'It may still work. Check your signal and try again.'
  );
});
