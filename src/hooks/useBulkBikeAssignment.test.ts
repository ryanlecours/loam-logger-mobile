import {
  ASSIGN_CHUNK_SIZE,
  chunkRideIds,
  isAssignmentRaceError,
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
