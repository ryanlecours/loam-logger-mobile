import { render, screen, fireEvent } from '@testing-library/react-native';
import { RecentRidesList } from './RecentRidesList';
import type { RideItem } from '../../hooks/useRidesPaginated';

/**
 * NOTE: in @testing-library/react-native v14 `render` is ASYNC and resolves to
 * void; queries come from the global `screen`.
 *
 * The record action is the thing under test. It has to reach a rider who has
 * never logged anything AND a rider with three hundred rides, because before
 * this it lived only behind the Rides tab's FAB, inside an alert offering two
 * choices, on a screen riders open second.
 */

/**
 * The row is its own component with its own tests, and it reaches for the
 * rider's distance-unit preference through Apollo. Stand it in with a plain
 * Text node: what matters here is that the list HAS rides, not how a row draws.
 *
 * `require` inside the factory, not a top-level import: jest.mock is hoisted
 * above the imports, so a hoisted binding would be read before it exists.
 */
jest.mock('../rides/RideListItem', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return {
    RideListItem: ({ ride }: { ride: { id: string } }) => <Text>{ride.id}</Text>,
  };
});

const onRecordPress = jest.fn();
const onAddRidePress = jest.fn();
const onConnectPress = jest.fn();
const onSeeAll = jest.fn();

const ride = (id: string): RideItem =>
  ({
    id,
    name: 'Lunch laps',
    startedAt: '2026-08-20T17:00:00.000Z',
    durationSec: 3600,
    distanceM: 12000,
    elevationGainM: 400,
    bikeId: 'bike-1',
    source: 'MANUAL',
  }) as unknown as RideItem;

const handlers = { onRecordPress, onAddRidePress, onConnectPress, onSeeAll };

beforeEach(() => {
  jest.clearAllMocks();
});

describe('RecentRidesList', () => {
  describe('with no rides', () => {
    it('offers recording alongside connecting', async () => {
      await render(<RecentRidesList rides={[]} bikes={[]} {...handlers} />);

      await fireEvent.press(screen.getByLabelText('Record a ride'));

      expect(onRecordPress).toHaveBeenCalledTimes(1);
    });

    it('keeps the manual path too', async () => {
      await render(<RecentRidesList rides={[]} bikes={[]} {...handlers} />);

      await fireEvent.press(screen.getByLabelText('Log a ride manually'));

      expect(onAddRidePress).toHaveBeenCalledTimes(1);
    });
  });

  describe('with rides', () => {
    // The "all users" half of this. A rider with a full list had no way to
    // start a recording from the dashboard at all.
    it('offers recording from the header', async () => {
      await render(<RecentRidesList rides={[ride('r1')]} bikes={[]} {...handlers} />);

      await fireEvent.press(screen.getByLabelText('Record a ride'));

      expect(onRecordPress).toHaveBeenCalledTimes(1);
    });

    it('still offers see all', async () => {
      await render(<RecentRidesList rides={[ride('r1')]} bikes={[]} {...handlers} />);

      await fireEvent.press(screen.getByLabelText('See all rides'));

      expect(onSeeAll).toHaveBeenCalledTimes(1);
    });
  });

  // A rider can back out of the record screen mid-ride. Offering "Record a
  // ride" then would invite starting a second one on top of the live session.
  describe('while a session is running', () => {
    it('points back at the ride instead, in the empty state', async () => {
      await render(<RecentRidesList rides={[]} bikes={[]} {...handlers} recorderLive />);

      expect(screen.queryByLabelText('Record a ride')).toBeNull();
      expect(screen.getByLabelText('Back to your ride in progress')).toBeTruthy();
    });

    it('points back at the ride instead, in the header', async () => {
      await render(
        <RecentRidesList rides={[ride('r1')]} bikes={[]} {...handlers} recorderLive />,
      );

      expect(screen.queryByLabelText('Record a ride')).toBeNull();
      expect(screen.getByLabelText('Back to your ride in progress')).toBeTruthy();
    });
  });

  it('renders no record action when the screen supplies no handler', async () => {
    await render(<RecentRidesList rides={[ride('r1')]} bikes={[]} onSeeAll={onSeeAll} />);

    expect(screen.queryByLabelText('Record a ride')).toBeNull();
  });
});
