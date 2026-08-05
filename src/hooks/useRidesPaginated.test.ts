jest.mock('../graphql/generated', () => ({
  useRidesPageQuery: jest.fn(),
}));

import { renderHook, act } from '@testing-library/react-native';
import { useRidesPageQuery } from '../graphql/generated';
import { useRidesPaginated } from './useRidesPaginated';

const mockUseRidesPageQuery = useRidesPageQuery as jest.Mock;

const ride = (n: number) => ({ id: `r${n}` });
const rideRange = (from: number, to: number) => {
  const out = [];
  for (let n = from; n <= to; n++) out.push(ride(n));
  return out;
};

/**
 * Stands in for Apollo's fetchMore/updateQuery cycle: each fetchMore call
 * consumes the next queued page, feeds it through the hook's updateQuery, and
 * publishes the merged result as the query's new `data`, exactly as the
 * normalized cache would.
 */
function installQueryMock(
  initialRides: { id: string }[],
  pages: { id: string }[][],
) {
  let data = { rides: initialRides };
  const queue = [...pages];
  const fetchMore = jest.fn(
    async (opts: {
      updateQuery: (
        prev: typeof data,
        ctx: { fetchMoreResult: typeof data },
      ) => typeof data;
    }) => {
      const nextPage = queue.shift() ?? [];
      data = opts.updateQuery(data, { fetchMoreResult: { rides: nextPage } });
    },
  );
  const refetch = jest.fn();
  mockUseRidesPageQuery.mockImplementation(() => ({
    data,
    loading: false,
    fetchMore,
    refetch,
  }));
  return { fetchMore, refetch };
}

describe('useRidesPaginated', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // The regression that motivated this file: with the persisted cache, a
  // cursor page can overlap rides already at the head of the list. Dedup
  // makes the merged length stop being a multiple of PAGE_SIZE, and an old
  // modulo gate then froze pagination forever despite more rides existing.
  it('keeps paginating after an overlapping page is deduped', async () => {
    const { fetchMore } = installQueryMock(
      rideRange(1, 20),
      [rideRange(15, 34), rideRange(35, 40)],
    );

    const { result, rerender } = await renderHook(() => useRidesPaginated());
    expect(result.current.hasMore).toBe(true);

    // Page overlaps r15..r20; only r21..r34 are fresh (14 rides, so the
    // list length 34 is not a multiple of 20).
    await act(async () => {
      result.current.loadMore();
    });
    await rerender(undefined);

    const ids = result.current.rides.map((r) => r.id);
    expect(ids).toHaveLength(34);
    expect(new Set(ids).size).toBe(34);
    expect(result.current.hasMore).toBe(true);

    // The next page is short, which is the real end of the list.
    await act(async () => {
      result.current.loadMore();
    });
    await rerender(undefined);

    expect(fetchMore).toHaveBeenCalledTimes(2);
    expect(result.current.rides).toHaveLength(40);
    expect(result.current.hasMore).toBe(false);

    // And once the end is known, loadMore stops issuing requests.
    await act(async () => {
      result.current.loadMore();
    });
    expect(fetchMore).toHaveBeenCalledTimes(2);
  });

  it('reports no more rides when the first page comes back short', async () => {
    const { fetchMore } = installQueryMock(rideRange(1, 5), []);

    const { result } = await renderHook(() => useRidesPaginated());

    expect(result.current.hasMore).toBe(false);
    await act(async () => {
      result.current.loadMore();
    });
    expect(fetchMore).not.toHaveBeenCalled();
  });

  it('stops instead of looping when a full page dedupes to nothing new', async () => {
    // Pathological cursor answer: 20 rows, every one already present. The
    // cursor cannot advance, so retrying would issue the identical request
    // forever.
    const { fetchMore } = installQueryMock(rideRange(1, 20), [rideRange(1, 20)]);

    const { result, rerender } = await renderHook(() => useRidesPaginated());

    await act(async () => {
      result.current.loadMore();
    });
    await rerender(undefined);

    expect(result.current.rides).toHaveLength(20);
    expect(result.current.hasMore).toBe(false);

    await act(async () => {
      result.current.loadMore();
    });
    expect(fetchMore).toHaveBeenCalledTimes(1);
  });

  it('issues one cursor request no matter how often onEndReached fires', async () => {
    const { fetchMore } = installQueryMock(rideRange(1, 20), [rideRange(21, 40)]);

    const { result } = await renderHook(() => useRidesPaginated());

    // FlatList fires onEndReached repeatedly while the rider sits at the
    // bottom; only the first call may issue the request.
    await act(async () => {
      result.current.loadMore();
      result.current.loadMore();
      result.current.loadMore();
    });

    expect(fetchMore).toHaveBeenCalledTimes(1);
  });
});
