import { Linking } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { RideLiftCard } from './RideLiftCard';
import { RideLiftKind } from '../../graphql/generated';

const mockSaveChoice = jest.fn();
let mockMutationState: { loading: boolean; error?: Error } = { loading: false };
jest.mock('../../graphql/generated', () => ({
  ...jest.requireActual('../../graphql/generated'),
  useSetRideLiftElevationMutation: () => [mockSaveChoice, mockMutationState],
}));

// render is async in @testing-library/react-native v14: await every render
// and read queries from `screen` (see RideTrackMap.test.tsx).

const RIDE_ID = 'ride-1';

const segment = (liftName: string | null, kind: RideLiftKind | null) => ({
  __typename: 'RideLiftSegment' as const,
  startTime: '2026-08-01T10:00:00.000Z',
  liftName,
  kind,
});

const defaultLift = {
  __typename: 'RideLift' as const,
  elevationGainMeters: 1500,
  countElevation: false,
  countElevationChoice: null,
  segments: [
    segment('Garbanzo Express', RideLiftKind.Chairlift),
    segment('Fitzsimmons Express', RideLiftKind.Chairlift),
    segment('Garbanzo Express', RideLiftKind.Chairlift),
  ],
};

const renderCard = (props: Partial<React.ComponentProps<typeof RideLiftCard>> = {}) =>
  render(
    <RideLiftCard
      rideId={RIDE_ID}
      elevationGainMeters={2000}
      countedElevationGainMeters={500}
      lift={defaultLift}
      distanceUnit="km"
      {...props}
    />
  );

describe('RideLiftCard', () => {
  beforeEach(() => {
    mockSaveChoice.mockReset().mockResolvedValue({});
    mockMutationState = { loading: false };
  });

  it('renders nothing when no lift was detected', async () => {
    await renderCard({ lift: null, countedElevationGainMeters: 2000 });
    expect(screen.queryByText(/detected/)).toBeNull();
    expect(screen.queryByText(/OpenStreetMap/)).toBeNull();
  });

  it('tags the ride with the lift kind, laps and lift names', async () => {
    await renderCard();
    expect(screen.getByText('Chairlift detected')).toBeTruthy();
    expect(screen.getByText('3 laps on Garbanzo Express, Fitzsimmons Express')).toBeTruthy();
  });

  it('says "Lift detected" with no names for a lift found from motion alone', async () => {
    await renderCard({ lift: { ...defaultLift, segments: [segment(null, null)] } });
    expect(screen.getByText('Lift detected')).toBeTruthy();
    expect(screen.getByText('1 lap')).toBeTruthy();
  });

  it('shows the default (not counted) with the counted and recorded climb', async () => {
    await renderCard();
    expect(screen.getByLabelText('Count the lift climb in this ride').props.value).toBe(false);
    expect(
      screen.getByText('The lift climbed 1,500 m for you, so this ride counts 500 m of the 2,000 m recorded.')
    ).toBeTruthy();
  });

  it('opens the OpenStreetMap copyright page from the credit', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await renderCard();
    fireEvent.press(screen.getByText('© OpenStreetMap contributors'));
    expect(openURL).toHaveBeenCalledWith('https://www.openstreetmap.org/copyright');
    openURL.mockRestore();
  });

  it('saves "count it" with an optimistic counted climb when the switch turns on', async () => {
    await renderCard();

    fireEvent(screen.getByLabelText('Count the lift climb in this ride'), 'valueChange', true);

    expect(mockSaveChoice).toHaveBeenCalledTimes(1);
    const { variables, optimisticResponse } = mockSaveChoice.mock.calls[0][0];
    expect(variables).toEqual({ rideId: RIDE_ID, count: true });
    expect(optimisticResponse.setRideLiftElevation).toMatchObject({
      __typename: 'Ride',
      id: RIDE_ID,
      countedElevationGainMeters: 2000,
      lift: { countElevation: true, countElevationChoice: true },
    });
  });

  it('saves "do not count it" and removes the lift share optimistically', async () => {
    await renderCard({
      countedElevationGainMeters: 2000,
      lift: { ...defaultLift, countElevation: true, countElevationChoice: true },
    });
    expect(screen.getByText('The lift climbed 1,500 m for you. This ride counts all 2,000 m recorded.')).toBeTruthy();

    fireEvent(screen.getByLabelText('Count the lift climb in this ride'), 'valueChange', false);

    expect(mockSaveChoice).toHaveBeenCalledTimes(1);
    const { variables, optimisticResponse } = mockSaveChoice.mock.calls[0][0];
    expect(variables).toEqual({ rideId: RIDE_ID, count: false });
    expect(optimisticResponse.setRideLiftElevation.countedElevationGainMeters).toBe(500);
    expect(optimisticResponse.setRideLiftElevation.lift.countElevation).toBe(false);
  });

  it('disables the switch while saving and reports a failed save', async () => {
    mockMutationState = { loading: true, error: new Error('Network down') };
    await renderCard();

    expect(screen.getByLabelText('Count the lift climb in this ride').props.disabled).toBe(true);
    expect(screen.getByText("Couldn't save your choice. Network down")).toBeTruthy();
  });
});
