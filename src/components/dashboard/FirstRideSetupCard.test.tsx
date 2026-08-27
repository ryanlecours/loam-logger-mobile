import { render, screen, fireEvent } from '@testing-library/react-native';
import { FirstRideSetupCard } from './FirstRideSetupCard';

/**
 * NOTE: in @testing-library/react-native v14 `render` is ASYNC and resolves to
 * void; queries come from the global `screen`.
 */

const onConnectPress = jest.fn();
const onAddRidePress = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

async function renderCard() {
  await render(
    <FirstRideSetupCard onConnectPress={onConnectPress} onAddRidePress={onAddRidePress} />,
  );
}

describe('FirstRideSetupCard', () => {
  it('offers the step that starts the clock', async () => {
    await renderCard();

    await fireEvent.press(screen.getByLabelText('Connect a data source'));

    expect(onConnectPress).toHaveBeenCalledTimes(1);
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
