import { render, screen } from '@testing-library/react-native';
import RouteMapView from './RouteMapView.native';
import LiveTrackMap from './LiveTrackMap.native';
import { canDrawNativeMap } from '../../lib/maps';

jest.mock('../../lib/maps', () => ({
  canDrawNativeMap: jest.fn(),
  mapUnavailableText: (base: string) => base,
}));
const mockCanDraw = canDrawNativeMap as jest.Mock;

/**
 * On Android without a Google Maps key, mounting a MapView throws inside the
 * Maps SDK and takes the screen down: on the record screen, mid-ride. These
 * pin that neither map component mounts a MapView in that case.
 *
 * Map nodes are hidden from accessibility, so lookups opt in (see
 * RideTrackMap.test.tsx). render is async in RNTL v14, so every render is
 * awaited.
 */
const HIDDEN = { includeHiddenElements: true } as const;

const POINTS: [number, number][] = [
  [45.0, -122.0],
  [45.001, -122.001],
];

beforeEach(() => jest.clearAllMocks());

describe('RouteMapView', () => {
  it('draws the map when the build can', async () => {
    mockCanDraw.mockReturnValue(true);
    await render(<RouteMapView points={POINTS} />);

    expect(screen.getByTestId('map-view', HIDDEN)).toBeTruthy();
  });

  it('shows a placeholder instead of mounting a map without a Maps key', async () => {
    mockCanDraw.mockReturnValue(false);
    await render(<RouteMapView points={POINTS} />);

    expect(screen.queryByTestId('map-view', HIDDEN)).toBeNull();
    expect(screen.getByText('Route map unavailable')).toBeTruthy();
  });
});

describe('LiveTrackMap', () => {
  const fix = { latitude: 45.0, longitude: -122.0 };

  it('draws the map when the build can', async () => {
    mockCanDraw.mockReturnValue(true);
    await render(<LiveTrackMap track={POINTS} trackLength={POINTS.length} lastFix={fix} />);

    expect(screen.getByTestId('map-view', HIDDEN)).toBeTruthy();
  });

  it('keeps the record screen up without a Maps key, and says recording continues', async () => {
    mockCanDraw.mockReturnValue(false);
    await render(<LiveTrackMap track={POINTS} trackLength={POINTS.length} lastFix={fix} />);

    expect(screen.queryByTestId('map-view', HIDDEN)).toBeNull();
    expect(screen.getByText('Map unavailable. Your ride is still recording.')).toBeTruthy();
  });
});
