import { render, screen, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { RideSourceCard, type RideSourceCardState } from './RideSourceCard';

/**
 * NOTE: in @testing-library/react-native v14 `render` is ASYNC and resolves to
 * void; queries come from the global `screen`.
 */

// The rows talk to the API for each provider's status; the card's job is only
// to put them on screen in the right state.
jest.mock('../integrations/ProviderConnectList', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    ProviderConnectList: () => <Text testID="provider-connect-list">connect rows</Text>,
  };
});

const handlers = {
  onRecordPress: jest.fn(),
  onAddRidePress: jest.fn(),
  onOpenSettings: jest.fn(),
  onDeclineTracker: jest.fn(),
  onReconsiderTracker: jest.fn(),
};

const NOW = new Date('2026-10-28T12:00:00Z');

beforeEach(() => {
  jest.clearAllMocks();
});

async function renderCard(state: RideSourceCardState, recorderLive = false) {
  await render(<RideSourceCard state={state} {...handlers} recorderLive={recorderLive} now={NOW} />);
}

describe('RideSourceCard', () => {
  describe('nothing connected', () => {
    it('says so plainly and never calls the bike healthy', async () => {
      await renderCard({ kind: 'none' });

      expect(screen.getByText('No ride source connected')).toBeTruthy();
      expect(screen.queryByText(/all good|good to go/i)).toBeNull();
    });

    // The onboarding step's rows, here, so connecting is one tap from the
    // screen the rider is looking at rather than a hunt through Settings.
    it('puts the provider connect rows inline', async () => {
      await renderCard({ kind: 'none' });

      expect(screen.getByTestId('provider-connect-list')).toBeTruthy();
    });

    it('offers recording without leaving the app', async () => {
      await renderCard({ kind: 'none' });

      await fireEvent.press(screen.getByLabelText('Record a ride'));

      expect(handlers.onRecordPress).toHaveBeenCalledTimes(1);
    });

    // A rider can back out of the record screen mid-ride. Saying "Record a
    // ride" then would invite starting a second one on top of the live session.
    it('points back at a session that is already running', async () => {
      await renderCard({ kind: 'none' }, true);

      expect(screen.queryByLabelText('Record a ride')).toBeNull();
      await fireEvent.press(screen.getByLabelText('Back to your ride in progress'));

      expect(handlers.onRecordPress).toHaveBeenCalledTimes(1);
    });

    it('offers the manual path', async () => {
      await renderCard({ kind: 'none' });

      await fireEvent.press(screen.getByLabelText('Log a ride manually'));

      expect(handlers.onAddRidePress).toHaveBeenCalledTimes(1);
    });

    it('lets the rider say they do not use a tracker', async () => {
      await renderCard({ kind: 'none' });

      await fireEvent.press(screen.getByLabelText("I don't use a ride tracker"));

      expect(handlers.onDeclineTracker).toHaveBeenCalledTimes(1);
    });

    // Free-tier riders see this card, and every action on it is free. Naming
    // Pro here would turn the one screen telling them what to do next into an
    // upsell.
    it('asks for nothing that costs money', async () => {
      await renderCard({ kind: 'none' });

      expect(screen.queryByText(/pro|upgrade|\$/i)).toBeNull();
    });
  });

  describe('importing', () => {
    it('names the provider and shows the count when there is one', async () => {
      await renderCard({
        kind: 'importing',
        provider: 'garmin',
        ridesFound: 12,
        startedAt: '2026-10-28T11:56:00Z',
      });

      expect(screen.getByText('Importing your rides from Garmin Connect™')).toBeTruthy();
      expect(screen.getByText('12 rides so far')).toBeTruthy();
      expect(screen.getByText('Started 4 minutes ago')).toBeTruthy();
      expect(screen.queryByTestId('provider-connect-list')).toBeNull();
    });

    // Strava reports its count only at the end; say what to expect instead.
    it('explains the wait when nothing can be counted yet', async () => {
      await renderCard({
        kind: 'importing',
        provider: 'strava',
        ridesFound: null,
        startedAt: '2026-10-28T11:59:50Z',
      });

      expect(screen.getByText(/Rides show up here as they arrive/)).toBeTruthy();
      expect(screen.getByText('Started just now')).toBeTruthy();
    });
  });

  describe('import finished with nothing', () => {
    it('names the window and offers record or log', async () => {
      await renderCard({ kind: 'empty', provider: 'strava', lookbackDays: 365 });

      expect(screen.getByText('Nothing found in the last year')).toBeTruthy();
      expect(screen.getByText(/Strava is connected, but it had no rides to import/)).toBeTruthy();
      expect(screen.getByLabelText('Record a ride')).toBeTruthy();
      expect(screen.getByLabelText('Log a ride manually')).toBeTruthy();
      // The source is connected; asking to connect another would be noise.
      expect(screen.queryByTestId('provider-connect-list')).toBeNull();
    });

    it('uses the 30-day window for WHOOP', async () => {
      await renderCard({ kind: 'empty', provider: 'whoop', lookbackDays: 30 });

      expect(screen.getByText('Nothing found in the last 30 days')).toBeTruthy();
    });

    // A connection that predates the connect import: nothing ever ran, so
    // "it had no rides to import" would be a claim about an import that did
    // not happen.
    it('does not invent a window or an import when none ever ran', async () => {
      await renderCard({ kind: 'empty', provider: 'suunto', lookbackDays: null });

      expect(screen.getByText('No rides have come in yet')).toBeTruthy();
      expect(screen.getByText(/no import has run for it yet/)).toBeTruthy();
      expect(screen.queryByText(/had no rides to import/)).toBeNull();
      await fireEvent.press(screen.getByLabelText('Import rides in Settings'));
      expect(handlers.onOpenSettings).toHaveBeenCalledTimes(1);
    });
  });

  it('points a failed import at Settings', async () => {
    await renderCard({ kind: 'failed', provider: 'suunto' });

    expect(screen.getByText("The import from Suunto didn't finish")).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Retry the import in Settings'));

    expect(handlers.onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('offers a way back for a rider who opted out', async () => {
    await renderCard({ kind: 'manual' });

    expect(screen.getByText('Logging rides by hand')).toBeTruthy();
    expect(screen.queryByTestId('provider-connect-list')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Connect a ride tracker after all'));

    expect(handlers.onReconsiderTracker).toHaveBeenCalledTimes(1);
  });
});

// Keeps the unused-import lint rule honest about the Text import above, which
// the mock factory cannot reach.
void Text;
