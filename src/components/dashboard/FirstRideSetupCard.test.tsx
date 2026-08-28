import { render, screen, fireEvent } from '@testing-library/react-native';
import { FirstRideSetupCard } from './FirstRideSetupCard';

/**
 * NOTE: in @testing-library/react-native v14 `render` is ASYNC and resolves to
 * void; queries come from the global `screen`.
 */

const onConnectPress = jest.fn();
const onRecordPress = jest.fn();
const onAddRidePress = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

async function renderCard(recorderLive = false) {
  await render(
    <FirstRideSetupCard
      onConnectPress={onConnectPress}
      onRecordPress={onRecordPress}
      onAddRidePress={onAddRidePress}
      recorderLive={recorderLive}
    />,
  );
}

describe('FirstRideSetupCard', () => {
  it('offers the step that starts the clock', async () => {
    await renderCard();

    await fireEvent.press(screen.getByLabelText('Connect a data source'));

    expect(onConnectPress).toHaveBeenCalledTimes(1);
  });

  // Recording was reachable only from the Rides tab's FAB, behind an alert
  // offering two choices. It needs no account and no typing, so it belongs on
  // the screen a rider with nothing logged is already looking at.
  it('offers recording without leaving the app', async () => {
    await renderCard();

    await fireEvent.press(screen.getByLabelText('Record a ride'));

    expect(onRecordPress).toHaveBeenCalledTimes(1);
  });

  // A rider can back out of the record screen mid-ride. Saying "Record a ride"
  // then would invite starting a second one on top of the live session.
  it('points back at a session that is already running', async () => {
    await renderCard(true);

    expect(screen.queryByLabelText('Record a ride')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Back to your ride in progress'));

    expect(onRecordPress).toHaveBeenCalledTimes(1);
  });

  it('offers the manual path for a rider who tracks nothing', async () => {
    await renderCard();

    await fireEvent.press(screen.getByLabelText('Log a ride manually'));

    expect(onAddRidePress).toHaveBeenCalledTimes(1);
  });

  /**
   * Backfill runs per provider from that provider's row in Settings, so it
   * cannot start before something is connected. A third button here would
   * dead-end a rider who has connected nothing, which is every rider seeing
   * this card.
   */
  it('does not offer an import button that would dead-end', async () => {
    await renderCard();

    expect(screen.queryByLabelText(/import/i)).toBeNull();
  });

  // Free-tier riders see this card, and every action on it is free. Naming Pro
  // here would turn the one screen telling them what to do next into an upsell.
  it('asks for nothing that costs money', async () => {
    await renderCard();

    expect(screen.queryByText(/pro|upgrade|\$/i)).toBeNull();
  });
});
