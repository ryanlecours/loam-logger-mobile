import { render, screen, fireEvent } from '@testing-library/react-native';
import { HealthyBikeList } from './HealthyBikeList';
import type { BikeFieldsFragment } from '../../graphql/generated';

/**
 * NOTE: in @testing-library/react-native v14 `render` is ASYNC and resolves to
 * void; queries come from the global `screen`.
 */

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: (...args: unknown[]) => mockPush(...args) }),
}));

const bike = (overrides: Partial<BikeFieldsFragment> = {}): BikeFieldsFragment =>
  ({
    id: 'bike-1',
    nickname: null,
    manufacturer: 'Evil',
    model: 'Offering X0',
    thumbnailUrl: 'https://example.test/offering.jpg',
    predictions: { components: [{}, {}, {}] },
    ...overrides,
  }) as unknown as BikeFieldsFragment;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('HealthyBikeList', () => {
  it('names the bike the rider owns', async () => {
    await render(<HealthyBikeList bikes={[bike()]} />);

    expect(screen.getByText('Evil Offering X0')).toBeTruthy();
  });

  it('prefers the nickname when there is one', async () => {
    await render(<HealthyBikeList bikes={[bike({ nickname: 'Lunch laps rig' })]} />);

    expect(screen.getByText('Lunch laps rig')).toBeTruthy();
  });

  it('counts the parts under watch', async () => {
    await render(<HealthyBikeList bikes={[bike()]} />);

    expect(screen.getByText('3 parts tracked')).toBeTruthy();
  });

  it('says part, not parts, for one', async () => {
    await render(
      <HealthyBikeList bikes={[bike({ predictions: { components: [{}] } } as never)]} />,
    );

    expect(screen.getByText('1 part tracked')).toBeTruthy();
  });

  /**
   * The headline above already made the health claim, and on the free tier
   * per-component status is nulled at the serving boundary, so a row here has
   * nothing to claim. Ramp words in this list would be a guess on free and a
   * duplicate on Pro.
   */
  it('carries no health language', async () => {
    await render(<HealthyBikeList bikes={[bike()]} />);

    expect(screen.queryByText(/good|due|overdue/i)).toBeNull();
  });

  it('opens the bike it names', async () => {
    await render(<HealthyBikeList bikes={[bike()]} />);

    await fireEvent.press(screen.getByLabelText('Evil Offering X0, 3 parts tracked'));

    expect(mockPush).toHaveBeenCalledWith('/bike/bike-1');
  });

  it('renders a row per bike', async () => {
    await render(
      <HealthyBikeList
        bikes={[bike(), bike({ id: 'bike-2', model: 'Following MB' })]}
      />,
    );

    expect(screen.getByText('Evil Offering X0')).toBeTruthy();
    expect(screen.getByText('Evil Following MB')).toBeTruthy();
  });
});
