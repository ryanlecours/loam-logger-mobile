const mockComplete = jest.fn();
jest.mock('../lib/auth', () => ({
  completeEmailSignIn: (...args: unknown[]) => mockComplete(...args),
}));

import { AppState, type AppStateStatus } from 'react-native';
import { renderHook, act } from '@testing-library/react-native';
import { useEmailSignInPoll } from './useEmailSignInPoll';

/**
 * NOTE: in @testing-library/react-native v14 `renderHook` is ASYNC.
 */

let appState: AppStateStatus = 'active';
let appStateListener: ((state: AppStateStatus) => void) | null = null;
const removeListener = jest.fn();

function setAppState(state: AppStateStatus) {
  appState = state;
  appStateListener?.(state);
}

beforeEach(() => {
  jest.useFakeTimers();
  mockComplete.mockReset();
  removeListener.mockReset();
  appState = 'active';
  appStateListener = null;
  // A plain property in the React Native mock, not a getter, so spyOn cannot wrap it.
  Object.defineProperty(AppState, 'currentState', { get: () => appState, configurable: true });
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    appStateListener = listener as (state: AppStateStatus) => void;
    return { remove: removeListener } as ReturnType<typeof AppState.addEventListener>;
  });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('useEmailSignInPoll', () => {
  it('asks at once, then every few seconds, and signs in once the link is opened', async () => {
    mockComplete
      .mockResolvedValueOnce({ status: 'pending' })
      .mockResolvedValueOnce({ status: 'pending' })
      .mockResolvedValue({ status: 'signed-in' });
    const onSignedIn = jest.fn();
    await renderHook(() => useEmailSignInPoll(true, onSignedIn));

    await act(async () => {});
    expect(mockComplete).toHaveBeenCalledTimes(1);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(6_000);
    });
    expect(mockComplete).toHaveBeenCalledTimes(3);
    expect(onSignedIn).toHaveBeenCalledTimes(1);
    expect(removeListener).toHaveBeenCalled();

    await act(async () => {
      await jest.advanceTimersByTimeAsync(60_000);
    });
    expect(mockComplete).toHaveBeenCalledTimes(3);
  });

  it('stops for good when there is no usable grant, and says so', async () => {
    mockComplete.mockResolvedValue({ status: 'unavailable' });
    const onSignedIn = jest.fn();
    const onUnavailable = jest.fn();
    await renderHook(() => useEmailSignInPoll(true, onSignedIn, { onUnavailable }));

    await act(async () => {
      await jest.advanceTimersByTimeAsync(10 * 60_000);
    });
    expect(mockComplete).toHaveBeenCalledTimes(1);
    expect(onSignedIn).not.toHaveBeenCalled();
    expect(onUnavailable).toHaveBeenCalledTimes(1);
  });

  it('asks only about the address it is waiting on', async () => {
    mockComplete.mockResolvedValue({ status: 'pending' });
    await renderHook(() => useEmailSignInPoll(true, jest.fn(), { expectedEmail: 'rider@example.com' }));
    await act(async () => {});

    expect(mockComplete).toHaveBeenCalledWith('rider@example.com');
  });

  it('waits in the background, and asks the moment the app is active again', async () => {
    mockComplete.mockResolvedValueOnce({ status: 'pending' }).mockResolvedValue({ status: 'signed-in' });
    const onSignedIn = jest.fn();
    await renderHook(() => useEmailSignInPoll(true, onSignedIn));
    await act(async () => {});
    expect(mockComplete).toHaveBeenCalledTimes(1);

    // The rider switches to their mail app.
    await act(async () => {
      setAppState('background');
      await jest.advanceTimersByTimeAsync(60_000);
    });
    expect(mockComplete).toHaveBeenCalledTimes(1);

    // And comes back after opening the link.
    await act(async () => {
      setAppState('active');
    });
    expect(mockComplete).toHaveBeenCalledTimes(2);
    expect(onSignedIn).toHaveBeenCalledTimes(1);
  });

  it('waits at least as long as a rate limit asked before trying again', async () => {
    mockComplete
      .mockResolvedValueOnce({ status: 'retry', retryAfterMs: 20_000 })
      .mockResolvedValue({ status: 'pending' });
    await renderHook(() => useEmailSignInPoll(true, jest.fn()));
    await act(async () => {});

    await act(async () => {
      await jest.advanceTimersByTimeAsync(19_000);
    });
    expect(mockComplete).toHaveBeenCalledTimes(1);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(1_000);
    });
    expect(mockComplete).toHaveBeenCalledTimes(2);
  });

  it('does nothing while disabled, and stops when the screen loses focus', async () => {
    mockComplete.mockResolvedValue({ status: 'pending' });
    const { rerender } = await renderHook(({ enabled }: { enabled: boolean }) => useEmailSignInPoll(enabled, jest.fn()), {
      initialProps: { enabled: false },
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(10_000);
    });
    expect(mockComplete).not.toHaveBeenCalled();

    await rerender({ enabled: true });
    await act(async () => {});
    expect(mockComplete).toHaveBeenCalledTimes(1);

    await rerender({ enabled: false });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(60_000);
    });
    expect(mockComplete).toHaveBeenCalledTimes(1);
    expect(removeListener).toHaveBeenCalled();
  });
});
