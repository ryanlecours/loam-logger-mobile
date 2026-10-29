const mockStartOAuth = jest.fn();
const mockGetIntegrationStatus = jest.fn();
jest.mock('../api/integrations', () => ({
  startOAuth: (...args: unknown[]) => mockStartOAuth(...args),
  getIntegrationStatus: (...args: unknown[]) => mockGetIntegrationStatus(...args),
  disconnectIntegration: jest.fn(),
}));

const mockOpenBrowserAsync = jest.fn();
jest.mock('expo-web-browser', () => ({
  openBrowserAsync: (...args: unknown[]) => mockOpenBrowserAsync(...args),
}));

import { renderHook, act } from '@testing-library/react-native';
import { useIntegrationConnect } from './useIntegrationConnect';
import { takeOAuthReturnTarget, setOAuthReturnTarget, peekOAuthReturnTarget, type OAuthReturnTarget } from '../lib/oauthReturn';

/**
 * NOTE: in @testing-library/react-native v14 `renderHook` is ASYNC.
 */

beforeEach(() => {
  mockStartOAuth.mockReset().mockResolvedValue({ authorizeUrl: 'https://provider.test/authorize' });
  mockGetIntegrationStatus.mockReset().mockResolvedValue({ connected: false });
  mockOpenBrowserAsync.mockReset().mockResolvedValue({ type: 'dismiss' });
  setOAuthReturnTarget(null);
});

describe('useIntegrationConnect', () => {
  it('records the return target before the provider page opens', async () => {
    let targetWhenBrowserOpened: OAuthReturnTarget | null | undefined;
    mockOpenBrowserAsync.mockImplementation(async () => {
      // Peek, not take: the callback is what consumes the record.
      targetWhenBrowserOpened = peekOAuthReturnTarget();
      return { type: 'dismiss' };
    });

    const { result } = await renderHook(() => useIntegrationConnect('strava', { returnTo: 'dashboard' }));
    await act(async () => {
      await result.current.connect();
    });

    expect(mockStartOAuth).toHaveBeenCalledWith('strava');
    expect(mockOpenBrowserAsync).toHaveBeenCalledWith('https://provider.test/authorize');
    expect(targetWhenBrowserOpened).toBe('dashboard');
    expect(takeOAuthReturnTarget()).toBe('dashboard');
  });

  it('clears any stale target when a connect starts without one', async () => {
    setOAuthReturnTarget('dashboard');

    const { result } = await renderHook(() => useIntegrationConnect('garmin'));
    await act(async () => {
      await result.current.connect();
    });

    // Settings and onboarding pass nothing; a dashboard record left behind
    // by an abandoned connect must not send this round-trip to the dashboard.
    expect(takeOAuthReturnTarget()).toBeNull();
  });

  it('records nothing when the start request fails before the browser opens', async () => {
    mockStartOAuth.mockRejectedValue(new Error('rate limited'));

    const { result } = await renderHook(() => useIntegrationConnect('whoop', { returnTo: 'dashboard' }));
    await act(async () => {
      await result.current.connect();
    });

    expect(mockOpenBrowserAsync).not.toHaveBeenCalled();
    expect(takeOAuthReturnTarget()).toBeNull();
    expect(result.current.error).toBe('rate limited');
  });
});
