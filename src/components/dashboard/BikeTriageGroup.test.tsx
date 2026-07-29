import { render, screen, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { BikeTriageGroup } from './BikeTriageGroup';
import {
  ComponentType,
  PredictionStatus,
  type BikeFieldsFragment,
  type ComponentPrediction,
} from '../../graphql/generated';

/**
 * NOTE: in @testing-library/react-native v14 `render` is ASYNC (React 19
 * concurrent rendering) and resolves to void rather than returning a query
 * bundle. Every render must be awaited, queries come from the global `screen`,
 * and `fireEvent` must be awaited too or the state update will not have
 * flushed before the assertions run.
 *
 * No MockedProvider: the advisor summary reaches this component as a plain
 * `footer` node, which is the whole point of that prop.
 */

jest.mock('../../lib/haptics', () => ({
  selectionTick: jest.fn(),
}));

const prediction = (
  overrides: Partial<ComponentPrediction> & { componentId: string }
): ComponentPrediction =>
  ({
    componentType: 'CHAIN',
    location: 'NONE',
    brand: 'SRAM',
    model: 'X01',
    status: 'OVERDUE',
    hoursRemaining: -40,
    ridesRemainingEstimate: 0,
    confidence: 'HIGH',
    currentHours: 90,
    serviceIntervalHours: 50,
    hoursSinceService: 90,
    ridesSinceService: 9,
    why: null,
    drivers: null,
    ...overrides,
  }) as ComponentPrediction;

const component = (id: string, type = 'CHAIN') =>
  ({
    id,
    type,
    location: 'NONE',
    brand: 'SRAM',
    model: 'X01',
    status: 'OVERDUE',
    hoursUsed: 90,
    serviceDueAtHours: 50,
    serviceLogs: [],
  }) as unknown as BikeFieldsFragment['components'][number];

const bike = (overrides: Partial<BikeFieldsFragment> = {}): BikeFieldsFragment =>
  ({
    id: 'bike-1',
    nickname: null,
    manufacturer: 'Propain',
    model: 'TYEE 6 CF',
    year: 2024,
    thumbnailUrl: 'https://example.test/tyee.jpg',
    category: 'mountain',
    isEbike: false,
    components: [component('comp-1'), component('comp-2', 'FORK')],
    ...overrides,
  }) as unknown as BikeFieldsFragment;

const defaultProps = {
  bike: bike(),
  components: [prediction({ componentId: 'comp-1' })],
  showStatus: true,
  expanded: false,
  onToggle: jest.fn(),
  onComponentPress: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('BikeTriageGroup', () => {
  describe('collapsed', () => {
    it('hides the component rows', async () => {
      await render(<BikeTriageGroup {...defaultProps} />);

      expect(screen.queryByText('Chain')).toBeNull();
    });

    it('reports itself as a collapsed button to a screen reader', async () => {
      await render(<BikeTriageGroup {...defaultProps} />);

      const header = screen.getByRole('button');
      expect(header.props.accessibilityState).toMatchObject({ expanded: false });
    });

    // The bike photo, the pill and the chevron are all visual. The header has
    // to speak the whole thing itself or a screen-reader user is told to
    // expand a group without being told what is in it.
    it('speaks the bike name, the worst state and the count', async () => {
      await render(<BikeTriageGroup {...defaultProps} />);

      expect(screen.getByLabelText('Propain TYEE 6 CF, Overdue, 1 part needs work')).toBeTruthy();
    });

    it('toggles when the header is pressed', async () => {
      await render(<BikeTriageGroup {...defaultProps} />);

      await fireEvent.press(screen.getByRole('button'));

      expect(defaultProps.onToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('expanded', () => {
    it('renders a row per component', async () => {
      await render(
        <BikeTriageGroup
          {...defaultProps}
          expanded
          components={[
            prediction({ componentId: 'comp-1' }),
            prediction({ componentId: 'comp-2', componentType: ComponentType.Fork }),
          ]}
        />
      );

      expect(screen.getByText('Chain')).toBeTruthy();
      expect(screen.getByText('Fork')).toBeTruthy();
    });

    it('renders the footer beneath the rows', async () => {
      await render(
        <BikeTriageGroup {...defaultProps} expanded footer={<Text>Fork service is due now.</Text>} />
      );

      expect(screen.getByText('Fork service is due now.')).toBeTruthy();
    });

    it('does not render the footer while collapsed', async () => {
      await render(
        <BikeTriageGroup {...defaultProps} footer={<Text>Fork service is due now.</Text>} />
      );

      expect(screen.queryByText('Fork service is due now.')).toBeNull();
    });

    // Once open, the component rows are buttons too, so the header has to be
    // picked out by its label rather than by role alone.
    it('reports itself as expanded', async () => {
      await render(<BikeTriageGroup {...defaultProps} expanded />);

      const header = screen.getByLabelText('Propain TYEE 6 CF, Overdue, 1 part needs work');
      expect(header.props.accessibilityState).toMatchObject({ expanded: true });
    });
  });

  describe('worst state', () => {
    // triageBikes hands components over worst-first, so the head of the list
    // is what the collapsed header has to name.
    it('names the first component status, not the last', async () => {
      await render(
        <BikeTriageGroup
          {...defaultProps}
          components={[
            prediction({ componentId: 'comp-1', status: PredictionStatus.DueNow }),
            prediction({ componentId: 'comp-2', status: PredictionStatus.DueSoon }),
          ]}
        />
      );

      expect(screen.getByLabelText(/Due now/)).toBeTruthy();
    });
  });

  describe('free tier', () => {
    // Statuses are nulled at the serving boundary, so there is no state to
    // name. The header must not guess at one, and must not borrow the ramp's
    // language for a count derived from raw counters.
    it('renders no health pill', async () => {
      await render(<BikeTriageGroup {...defaultProps} showStatus={false} />);

      expect(screen.queryByLabelText(/Service status/)).toBeNull();
    });

    it('counts parts past their interval instead of naming a state', async () => {
      await render(
        <BikeTriageGroup
          {...defaultProps}
          showStatus={false}
          components={[
            prediction({ componentId: 'comp-1' }),
            prediction({ componentId: 'comp-2' }),
          ]}
        />
      );

      expect(screen.getByLabelText('Propain TYEE 6 CF, 2 parts past their interval')).toBeTruthy();
    });
  });

  describe('counts', () => {
    it('reads singular for one part', async () => {
      await render(<BikeTriageGroup {...defaultProps} />);

      expect(screen.getByText('1 part needs work')).toBeTruthy();
    });

    it('reads plural for several parts', async () => {
      await render(
        <BikeTriageGroup
          {...defaultProps}
          components={[
            prediction({ componentId: 'comp-1' }),
            prediction({ componentId: 'comp-2' }),
          ]}
        />
      );

      expect(screen.getByText('2 parts need work')).toBeTruthy();
    });
  });

  it('prefers the nickname over manufacturer and model', async () => {
    await render(<BikeTriageGroup {...defaultProps} bike={bike({ nickname: 'Big Red' })} />);

    expect(screen.getByText('Big Red')).toBeTruthy();
  });
});
