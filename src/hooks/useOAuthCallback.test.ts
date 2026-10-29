const mockDismissTo = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    dismissTo: (...args: unknown[]) => mockDismissTo(...args),
    replace: (...args: unknown[]) => mockReplace(...args),
  }),
}));

const mockDismissBrowser = jest.fn();
jest.mock('expo-web-browser', () => ({
  dismissBrowser: (...args: unknown[]) => mockDismissBrowser(...args),
}));

// `mock` prefix: jest hoists the factory above this declaration and only
// allows out-of-scope references that are named that way.
let mockOnboardingCompleted = true;
jest.mock('./useAuth', () => ({
  useAuth: () => ({ onboardingCompleted: mockOnboardingCompleted }),
}));

import { Alert } from 'react-native';
import { renderHook, act } from '@testing-library/react-native';
import { useOAuthCallback, oauthReturnHref } from './useOAuthCallback';
import { setOAuthReturnTarget, takeOAuthReturnTarget } from '../lib/oauthReturn';

/**
 * NOTE: in @testing-library/react-native v14 `renderHook` is ASYNC.
 */

beforeEach(() => {
  jest.useFakeTimers();
  mockDismissTo.mockReset();
  mockReplace.mockReset();
  mockDismissBrowser.mockReset();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  mockOnboardingCompleted = true;
  setOAuthReturnTarget(null);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('oauthReturnHref', () => {
  it('returns to the onboarding Connect step while onboarding is incomplete', () => {
    expect(oauthReturnHref(false)).toBe('/(onboarding)/connect');
  });

  it('returns to Settings once onboarding is complete', () => {
    expect(oauthReturnHref(true)).toBe('/(tabs)/settings');
  });

  it('returns to the dashboard when its ride-source card started the connect', () => {
    expect(oauthReturnHref(true, 'dashboard')).toBe('/(tabs)');
  });

  it('keeps an onboarding rider on the Connect step whatever was recorded', () => {
    expect(oauthReturnHref(false, 'dashboard')).toBe('/(onboarding)/connect');
  });
});

describe('useOAuthCallback', () => {
  it('pops back to the Connect step that opened the browser, keeping its state', async () => {
    mockOnboardingCompleted = false;
    await renderHook(() => useOAuthCallback('Garmin Connect', 'success', undefined));

    expect(mockDismissBrowser).toHaveBeenCalledTimes(1);
    expect(mockDismissTo).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(mockDismissTo).toHaveBeenCalledWith('/(onboarding)/connect');
    // A replace would mount a second (onboarding) stack with an empty
    // OnboardingProvider, losing the rider's age and bike.
    expect(mockReplace).not.toHaveBeenCalled();
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('pops back to Settings for an onboarded rider', async () => {
    await renderHook(() => useOAuthCallback('Strava', 'success', undefined));

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(mockDismissTo).toHaveBeenCalledWith('/(tabs)/settings');
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('explains a failed round-trip and still returns the rider', async () => {
    mockOnboardingCompleted = false;
    await renderHook(() => useOAuthCallback('WHOOP', 'error', 'access_denied'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'WHOOP Connection Failed',
      'You declined to authorize Loam Logger.'
    );

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(mockDismissTo).toHaveBeenCalledWith('/(onboarding)/connect');
  });

  it('shows the failure alert once even if auth state refreshes mid-beat', async () => {
    mockOnboardingCompleted = false;
    const { rerender } = await renderHook(() =>
      useOAuthCallback('Garmin Connect', 'error', 'invalid_state')
    );
    expect(Alert.alert).toHaveBeenCalledTimes(1);

    // A viewer refetch flips the flag while the screen is still mounted,
    // which re-runs the effect.
    mockOnboardingCompleted = true;
    await act(async () => {
      rerender(undefined);
    });

    expect(Alert.alert).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    // The restarted timer uses the fresh flag.
    expect(mockDismissTo).toHaveBeenCalledTimes(1);
    expect(mockDismissTo).toHaveBeenCalledWith('/(tabs)/settings');
  });

  it('falls back to a generic message for an unknown reason code', async () => {
    await renderHook(() => useOAuthCallback('Suunto', 'error', 'something_new'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Suunto Connection Failed',
      'Something went wrong. Please try connecting again.'
    );
  });

  it('does not navigate if the screen unmounts before the beat', async () => {
    const { unmount } = await renderHook(() =>
      useOAuthCallback('Garmin Connect', 'success', undefined)
    );
    // Unmount inside act so the effect cleanup (which clears the timer) has
    // run before the clock advances.
    await act(async () => {
      unmount();
    });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(mockDismissTo).not.toHaveBeenCalled();
  });
});

describe('useOAuthCallback return target', () => {
  it('pops back to the dashboard when its ride-source card opened the browser', async () => {
    setOAuthReturnTarget('dashboard');
    await renderHook(() => useOAuthCallback('Strava', 'success', undefined));

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(mockDismissTo).toHaveBeenCalledWith('/(tabs)');
    // Consumed by this round-trip: the next callback must not inherit it.
    expect(takeOAuthReturnTarget()).toBeNull();
  });

  it('reads the recorded target once, even when auth state refreshes mid-beat', async () => {
    setOAuthReturnTarget('dashboard');
    const { rerender } = await renderHook(() => useOAuthCallback('Strava', 'success', undefined));

    mockOnboardingCompleted = true;
    await act(async () => {
      rerender(undefined);
    });
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(mockDismissTo).toHaveBeenCalledTimes(1);
    expect(mockDismissTo).toHaveBeenCalledWith('/(tabs)');
  });

  it('falls back to Settings on a cold start with nothing recorded', async () => {
    await renderHook(() => useOAuthCallback('Strava', 'success', undefined));

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(mockDismissTo).toHaveBeenCalledWith('/(tabs)/settings');
  });
});
