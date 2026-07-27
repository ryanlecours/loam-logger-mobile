import { render, screen, waitFor } from '@testing-library/react-native';
import { MockedProvider } from '@apollo/client/testing';
import { RideTrackMap } from './RideTrackMap';
import { RideTrackDocument } from '../../graphql/generated';

/**
 * Ported from apps/web/src/components/RideTrackMap.test.tsx, minus the two
 * cases covering the FETCHABLE load-and-poll flow that mobile does not
 * implement, plus three attribution cases the web suite does not have.
 *
 * The attribution cases are the ones that matter most. Garmin reviews
 * applications for attribution compliance and can suspend API access over it,
 * and the failure mode is silent: crediting the wrong provider looks correct
 * on screen and would pass any test that only checked "a map rendered".
 *
 * NOTE: in @testing-library/react-native v14 `render` is ASYNC (React 19
 * concurrent rendering) and resolves to void rather than returning a query
 * bundle. Every render must be awaited, and queries come from the global
 * `screen`. Destructuring queries off render()'s result silently yields
 * undefined.
 */

/**
 * The map is deliberately hidden from the accessibility tree: it is
 * decorative, and the card title plus the attribution line carry the meaning.
 * RNTL's queries honour that by default, so every map lookup has to opt in.
 * If these ever start passing without it, the map has stopped being marked
 * decorative and VoiceOver users are hearing a bare map view.
 */
const HIDDEN = { includeHiddenElements: true } as const;

const RIDE_ID = 'ride-1';

const POINTS: [number, number][] = [
  [45.0, -122.0],
  [45.001, -122.001],
  [45.002, -122.002],
];

const trackMock = (track: {
  status: string;
  points?: [number, number][] | null;
  sampledFrom?: number | null;
  source?: string | null;
  garminDeviceName?: string | null;
}) => ({
  request: { query: RideTrackDocument, variables: { rideId: RIDE_ID } },
  result: {
    data: {
      rideTrack: {
        __typename: 'RideTrack',
        points: null,
        sampledFrom: null,
        source: null,
        garminDeviceName: null,
        ...track,
      },
    },
  },
});

const renderWithMocks = (mocks: ReturnType<typeof trackMock>[]) =>
  render(
    <MockedProvider mocks={mocks}>
      <RideTrackMap rideId={RIDE_ID} />
    </MockedProvider>
  );

describe('RideTrackMap', () => {
  it('renders a skeleton while the initial query loads', async () => {
    await renderWithMocks([
      trackMock({ status: 'AVAILABLE', points: POINTS, source: 'strava' }),
    ]);

    // Nothing has resolved yet: the card is holding space, but no map.
    expect(screen.queryByTestId('map-view', HIDDEN)).toBeNull();
    expect(screen.queryByText('Route')).toBeNull();
  });

  it('renders the map for an AVAILABLE track', async () => {
    await renderWithMocks([
      trackMock({ status: 'AVAILABLE', points: POINTS, sampledFrom: 800, source: 'strava' }),
    ]);

    expect(await screen.findByTestId('map-view', HIDDEN)).toBeTruthy();
    expect(screen.getByText('Route')).toBeTruthy();
  });

  it('passes the track coordinates to the polyline', async () => {
    await renderWithMocks([
      trackMock({ status: 'AVAILABLE', points: POINTS, source: 'strava' }),
    ]);

    const polyline = await screen.findByTestId('map-polyline', HIDDEN);
    // [lat, lng] pairs from the API become {latitude, longitude} for the map.
    expect(polyline.props.coordinates).toEqual([
      { latitude: 45.0, longitude: -122.0 },
      { latitude: 45.001, longitude: -122.001 },
      { latitude: 45.002, longitude: -122.002 },
    ]);
  });

  it('renders nothing for UNAVAILABLE rides', async () => {
    await renderWithMocks([
      trackMock({ status: 'UNAVAILABLE' }),
    ]);

    await waitFor(() => expect(screen.queryByText('Route')).toBeNull());
    expect(screen.queryByTestId('map-view', HIDDEN)).toBeNull();
  });

  // FETCHABLE is a legacy-Strava state that web handles with a "Load route
  // map" button. Mobile deliberately collapses instead; this pins that so the
  // omission stays a decision rather than becoming a bug someone "fixes".
  it('renders nothing for FETCHABLE rides', async () => {
    await renderWithMocks([trackMock({ status: 'FETCHABLE' })]);

    await waitFor(() => expect(screen.queryByText('Route')).toBeNull());
  });

  describe('Garmin attribution', () => {
    it('attributes a Garmin-sourced track to the recording device', async () => {
      await renderWithMocks([
        trackMock({
          status: 'AVAILABLE',
          points: POINTS,
          source: 'garmin',
          garminDeviceName: 'edge_840',
        }),
      ]);

      expect(await screen.findByText('Data source: Garmin Edge 840')).toBeTruthy();
    });

    it('falls back to plain "Garmin" when no device was reported', async () => {
      await renderWithMocks([
        trackMock({
          status: 'AVAILABLE',
          points: POINTS,
          source: 'garmin',
          garminDeviceName: null,
        }),
      ]);

      expect(await screen.findByText('Data source: Garmin')).toBeTruthy();
    });

    // The trap. A ride matched across providers carries both activity ids but
    // only ONE persisted stream. Gating on ride.garminActivityId instead of
    // track.source would credit Garmin for a Strava-recorded track: a
    // misrepresentation of a partner's data in the direction Garmin cares most
    // about, and one that would look perfectly fine on screen.
    it('shows NO Garmin attribution on a Strava-sourced track', async () => {
      await renderWithMocks([
        trackMock({
          status: 'AVAILABLE',
          points: POINTS,
          source: 'strava',
          garminDeviceName: null,
        }),
      ]);

      // Wait for the map so we know the query resolved before asserting absence.
      await screen.findByTestId('map-view', HIDDEN);
      expect(screen.queryByText(/Garmin/)).toBeNull();
    });
  });
});
