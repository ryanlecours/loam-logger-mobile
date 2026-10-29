// In-memory SecureStore, so the tests can see what a choice wrote without a
// device keychain.
const mockStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn((key: string) => Promise.resolve(mockStore.get(key) ?? null)),
  setItemAsync: jest.fn((key: string, value: string) => {
    mockStore.set(key, value);
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((key: string) => {
    mockStore.delete(key);
    return Promise.resolve();
  }),
}));

const mockCapture = jest.fn();
jest.mock('../lib/posthog', () => ({
  posthog: { capture: (...args: unknown[]) => mockCapture(...args) },
}));

import * as SecureStore from 'expo-secure-store';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useManualRideSourceChoice } from './useManualRideSourceChoice';
import { manualRideSourceKey } from '../utils/rideSource';

/**
 * NOTE: in @testing-library/react-native v14 `renderHook` is ASYNC, and it
 * flushes effects before resolving, so an in-memory store answers before the
 * hook is handed back. The "not ready yet" assertions hold the read open
 * with a deferred promise instead.
 */
function deferRead(): { resolve: (value: string | null) => void } {
  let resolve!: (value: string | null) => void;
  jest.mocked(SecureStore.getItemAsync).mockImplementationOnce(
    () => new Promise<string | null>((r) => (resolve = r)),
  );
  return { resolve: (value) => resolve(value) };
}

beforeEach(() => {
  mockStore.clear();
  mockCapture.mockReset();
});

describe('useManualRideSourceChoice', () => {
  // The card must not render from the placeholder: an opted-out rider would
  // see the four connect rows for a beat before the manual face replaced them.
  it('is not ready until the stored choice has been read', async () => {
    const read = deferRead();

    const { result } = await renderHook(() => useManualRideSourceChoice('user-1'));

    expect(result.current.ready).toBe(false);
    expect(result.current.manualOnly).toBe(false);

    await act(async () => read.resolve('1'));

    expect(result.current.ready).toBe(true);
    expect(result.current.manualOnly).toBe(true);
  });

  it('is ready and false for an account that never opted out', async () => {
    const { result } = await renderHook(() => useManualRideSourceChoice('user-1'));

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.manualOnly).toBe(false);
  });

  it('never reports ready without an account', async () => {
    const { result } = await renderHook(() => useManualRideSourceChoice(undefined));

    expect(result.current.ready).toBe(false);
    expect(result.current.manualOnly).toBe(false);
  });

  it('stores the choice per account and reports it once', async () => {
    const { result } = await renderHook(() => useManualRideSourceChoice('user-1'));
    await waitFor(() => expect(result.current.ready).toBe(true));

    await act(async () => result.current.setManualOnly(true));
    // A second tap on the same answer is a no-op, not a second event.
    await act(async () => result.current.setManualOnly(true));

    expect(result.current.manualOnly).toBe(true);
    expect(mockStore.get(manualRideSourceKey('user-1'))).toBe('1');
    expect(mockCapture).toHaveBeenCalledTimes(1);
    expect(mockCapture).toHaveBeenCalledWith('ride_source_opted_out', { surface: 'dashboard' });

    await act(async () => result.current.setManualOnly(false));

    expect(result.current.manualOnly).toBe(false);
    expect(mockStore.has(manualRideSourceKey('user-1'))).toBe(false);
    expect(mockCapture).toHaveBeenLastCalledWith('ride_source_opt_out_cleared', { surface: 'dashboard' });
  });

  // Two riders on one phone must not share the answer, and the second must
  // not be shown the first rider's value while their own is still loading.
  it('re-reads for a different account and is not ready in between', async () => {
    mockStore.set(manualRideSourceKey('user-1'), '1');
    const { result, rerender } = await renderHook(
      ({ userId }: { userId: string }) => useManualRideSourceChoice(userId),
      { initialProps: { userId: 'user-1' } },
    );
    await waitFor(() => expect(result.current.manualOnly).toBe(true));

    const read = deferRead();
    await rerender({ userId: 'user-2' });

    expect(result.current.ready).toBe(false);
    expect(result.current.manualOnly).toBe(false);

    await act(async () => read.resolve(null));

    expect(result.current.ready).toBe(true);
    expect(result.current.manualOnly).toBe(false);
  });
});
