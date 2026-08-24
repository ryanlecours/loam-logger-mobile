jest.mock('../graphql/generated', () => ({
  useAssignBikeToRidesMutation: jest.fn(),
  useUnassignedRideIdsLazyQuery: jest.fn(),
  useUnassignedRideSummaryLazyQuery: jest.fn(),
}));
jest.mock('@apollo/client', () => ({ useApolloClient: jest.fn() }));

import { renderHook, act } from '@testing-library/react-native';
import { useApolloClient } from '@apollo/client';
import {
  useAssignBikeToRidesMutation,
  useUnassignedRideIdsLazyQuery,
  useUnassignedRideSummaryLazyQuery,
} from '../graphql/generated';
import {
  ASSIGN_CHUNK_SIZE,
  MAX_RIDES_PER_PASS,
  chunkRideIds,
  isAssignmentRaceError,
  useBulkBikeAssignment,
} from './useBulkBikeAssignment';

/**
 * The two rules that decide whether a bulk assignment tells the rider the
 * truth: how a large selection is split, and which failures are worth a silent
 * retry. Both are easy to "simplify" into being wrong.
 */

describe('chunkRideIds', () => {
  it('splits a selection into bounded calls', () => {
    const ids = Array.from({ length: 1200 }, (_, i) => `ride-${i}`);

    expect(chunkRideIds(ids).map((chunk) => chunk.length)).toEqual([500, 500, 200]);
  });

  it('keeps every id, in order, exactly once', () => {
    const ids = Array.from({ length: 1201 }, (_, i) => `ride-${i}`);

    expect(chunkRideIds(ids).flat()).toEqual(ids);
  });

  it('returns nothing for an empty selection rather than one empty call', () => {
    // A zero-length chunk would be a mutation that assigns nothing and still
    // burns a rate-limit slot.
    expect(chunkRideIds([])).toEqual([]);
  });

  it('does not exceed the chunk size for a selection that fits exactly', () => {
    const ids = Array.from({ length: ASSIGN_CHUNK_SIZE }, (_, i) => `ride-${i}`);

    expect(chunkRideIds(ids)).toHaveLength(1);
  });
});

describe('isAssignmentRaceError', () => {
  it('recognises the server refusing a batch that gained a bike mid-flight', () => {
    // The one failure worth retrying: a sync webhook assigned one of these
    // rides between reading the ids and sending them.
    expect(
      isAssignmentRaceError(new Error('One or more rides already have a bike assigned'))
    ).toBe(true);
  });

  it('leaves every other failure alone', () => {
    expect(isAssignmentRaceError(new Error('Failed to fetch'))).toBe(false);
    expect(isAssignmentRaceError(new Error('Rate limit exceeded. Try again in 30 seconds.'))).toBe(
      false
    );
    expect(isAssignmentRaceError(new Error('Bike not found'))).toBe(false);
  });

  it('handles a thrown non-Error without blowing up the retry decision', () => {
    expect(isAssignmentRaceError(undefined)).toBe(false);
    expect(isAssignmentRaceError('already have a bike')).toBe(true);
  });
});

describe('useBulkBikeAssignment run', () => {
  const mockAssign = jest.fn();
  const mockFetchIds = jest.fn();
  const mockFetchSummary = jest.fn();
  const mockRefetchQueries = jest.fn();

  const idsFor = (count: number) => ({
    data: { rides: Array.from({ length: count }, (_, i) => ({ id: `ride-${i}` })) },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (useAssignBikeToRidesMutation as jest.Mock).mockReturnValue([mockAssign]);
    (useUnassignedRideIdsLazyQuery as jest.Mock).mockReturnValue([mockFetchIds]);
    (useUnassignedRideSummaryLazyQuery as jest.Mock).mockReturnValue([mockFetchSummary]);
    (useApolloClient as jest.Mock).mockReturnValue({ refetchQueries: mockRefetchQueries });
    mockRefetchQueries.mockResolvedValue([]);
    mockAssign.mockResolvedValue({
      data: { assignBikeToRides: { success: true, updatedCount: 500 } },
    });
    mockFetchIds.mockResolvedValue(idsFor(MAX_RIDES_PER_PASS));
  });

  const run = async (expectedCount: number) => {
    const { result } = await renderHook(() => useBulkBikeAssignment());
    let outcome;
    await act(async () => {
      outcome = await result.current.run({ bikeId: 'bike-1', filter: {}, expectedCount });
    });
    return outcome;
  };

  it('reports what the server says is left, not the preview minus what landed', async () => {
    // 2600 previewed, 2000 assigned here, and 40 of the rest were flagged
    // "not my bike" on the web meanwhile. Arithmetic would say 600.
    mockFetchSummary.mockResolvedValue({ data: { unassignedRideSummary: { totalCount: 560 } } });

    expect(await run(2600)).toEqual({ kind: 'assigned', assigned: 2000, remaining: 560 });
  });

  it('falls back to the previewed count when that count cannot be read back', async () => {
    // A failed count is a stale number, not a failed assignment: the outcome
    // still has to say the rides landed.
    mockFetchSummary.mockRejectedValue(new Error('Network error'));

    expect(await run(2600)).toEqual({ kind: 'assigned', assigned: 2000, remaining: 600 });
  });

  it('reports nothing to do without guessing why the selection emptied', async () => {
    mockFetchIds.mockResolvedValue(idsFor(0));

    expect(await run(2600)).toEqual({ kind: 'nothing' });
    expect(mockAssign).not.toHaveBeenCalled();
  });

  const RACE = new Error('Some of those rides already have a bike');

  it('retries once against a fresh id list when the first write loses the webhook race', async () => {
    // A sync webhook gave one of the previewed rides a bike between the id
    // read and the first write, so the server refused the whole batch. Nothing
    // committed, so re-reading the ids and going again is safe.
    mockFetchIds
      .mockResolvedValueOnce(idsFor(500))
      .mockResolvedValueOnce(idsFor(400));
    mockAssign
      .mockRejectedValueOnce(RACE)
      .mockResolvedValueOnce({
        data: { assignBikeToRides: { success: true, updatedCount: 400 } },
      });
    mockFetchSummary.mockResolvedValue({ data: { unassignedRideSummary: { totalCount: 0 } } });

    expect(await run(500)).toEqual({ kind: 'assigned', assigned: 400, remaining: 0 });
    // The retry read fresh ids rather than reusing the batch the server just
    // rejected, which is the whole point of retrying.
    expect(mockFetchIds).toHaveBeenCalledTimes(2);
    expect(mockAssign).toHaveBeenCalledTimes(2);
  });

  it('gives up after the second attempt rather than retrying the race forever', async () => {
    mockFetchIds.mockResolvedValue(idsFor(500));
    mockAssign.mockRejectedValue(RACE);

    expect(await run(500)).toEqual({ kind: 'failed' });
    expect(mockFetchIds).toHaveBeenCalledTimes(2);
  });

  it('reports partial with what landed when a later chunk fails', async () => {
    // Two chunks commit, the third does not. Each chunk is its own
    // transaction, so 1000 rides really do have a bike now.
    mockFetchIds.mockResolvedValue(idsFor(1500));
    mockAssign
      .mockResolvedValueOnce({ data: { assignBikeToRides: { success: true, updatedCount: 500 } } })
      .mockResolvedValueOnce({ data: { assignBikeToRides: { success: true, updatedCount: 500 } } })
      .mockRejectedValueOnce(new Error('Network error'));

    expect(await run(1500)).toEqual({ kind: 'partial', assigned: 1000 });
    // No second pass: re-reading the ids here would double-count the 1000 the
    // rider has already been shown as done.
    expect(mockFetchIds).toHaveBeenCalledTimes(1);
    expect(mockRefetchQueries).toHaveBeenCalled();
  });

  it('does not retry a race error once chunks have already committed', async () => {
    // Same race, but after real work landed. Retrying would re-read ids that
    // no longer include the committed rides and restart the count.
    mockFetchIds.mockResolvedValue(idsFor(1000));
    mockAssign
      .mockResolvedValueOnce({ data: { assignBikeToRides: { success: true, updatedCount: 500 } } })
      .mockRejectedValueOnce(RACE);

    expect(await run(1000)).toEqual({ kind: 'partial', assigned: 500 });
    expect(mockFetchIds).toHaveBeenCalledTimes(1);
  });

  it('fails cleanly when the very first chunk fails for a reason retrying cannot fix', async () => {
    mockFetchIds.mockResolvedValue(idsFor(500));
    mockAssign.mockRejectedValue(new Error('Network error'));

    expect(await run(500)).toEqual({ kind: 'failed' });
    expect(mockFetchIds).toHaveBeenCalledTimes(1);
  });
});
