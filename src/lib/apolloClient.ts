import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  ApolloLink,
  Observable,
  fromPromise,
  type FetchResult,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { CachePersistor } from 'apollo3-cache-persist';
import Storage from 'expo-sqlite/kv-store';
import { getAccessToken, refreshAccessToken } from './auth';

// Dedupe concurrent refresh attempts. When multiple queries land at once and
// all 401, we want one /refresh round-trip — not N parallel refreshes that
// race against each other.
let inFlightRefresh: Promise<string | null> | null = null;
function dedupedRefresh(): Promise<string | null> {
  if (!inFlightRefresh) {
    inFlightRefresh = refreshAccessToken().finally(() => {
      inFlightRefresh = null;
    });
  }
  return inFlightRefresh;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

const httpLink = new HttpLink({
  uri: `${API_URL}/graphql`,
  credentials: 'include',
});

const authLink = setContext(async (_, { headers }) => {
  const token = await getAccessToken();

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (networkError) {
    console.warn(`[Network error]: ${networkError}`);
  }

  if (!graphQLErrors) return;

  const hasUnauth = graphQLErrors.some(
    (err) => err.extensions?.code === 'UNAUTHENTICATED',
  );
  if (!hasUnauth) return;

  return fromPromise(dedupedRefresh()).flatMap((newToken) => {
    if (!newToken) {
      // Refresh failed; refreshAccessToken already cleared SecureStore.
      // Surface the original UNAUTHENTICATED so useAuth's logout-on-error
      // effect routes the user back to login. Synthesizing the result here
      // avoids a doomed retry that would loop straight back into this link.
      return Observable.of<FetchResult>({ errors: graphQLErrors });
    }

    operation.setContext(
      ({ headers = {} }: { headers?: Record<string, unknown> }) => ({
        headers: {
          ...headers,
          authorization: `Bearer ${newToken}`,
        },
      }),
    );

    return forward(operation);
  });
});

const cache = new InMemoryCache({
  canonizeResults: false,
  // Neither BikePredictionSummary nor ComponentPrediction has an `id`
  // field (they have bikeId / componentId). Without an explicit keyFields
  // policy, Apollo treats them as embedded objects and REPLACES the whole
  // object on any partial write — so when a second query for the same bike
  // fetches only some fields of predictions (e.g. BikeAdvisorSummary,
  // which asks only for `bikeId, advisorSummary`), the cache-write drops
  // every other field (overallStatus, components, dueNowCount, etc.) and
  // the bike-detail screen's health badge and component list go blank a
  // moment after paint. Explicit keyFields makes them their own normalized
  // entities so Apollo field-merges partial writes automatically. Add the
  // same policy for any future prediction-related type without an `id`.
  typePolicies: {
    BikePredictionSummary: {
      keyFields: ['bikeId'],
    },
    ComponentPrediction: {
      keyFields: ['componentId'],
    },
  },
});

// Persist the normalized cache to disk (expo-sqlite/kv-store) so the rides
// list, dashboard, and bike screens render their last-synced data instantly,
// including with no connectivity at a trailhead. The existing per-call-site
// cache-and-network policies then revalidate in the background when a
// connection exists. Restore is awaited in app/_layout.tsx before anything
// renders, so no query ever races an empty-but-about-to-fill cache.
export const cachePersistor = new CachePersistor({
  cache,
  storage: Storage,
  key: 'loam-apollo-cache',
  // Persistence silently pauses beyond this size instead of crashing writes.
  // 4 MB comfortably holds ride pages and predictions; ride GPS tracks are
  // the one heavy payload, and they re-fetch on demand.
  maxSize: 4 * 1024 * 1024,
});

export async function restoreApolloCache(): Promise<void> {
  try {
    await cachePersistor.restore();
  } catch (error) {
    // A corrupt persisted blob must never brick startup. Drop it, start cold.
    console.warn('[apollo] cache restore failed, starting cold', error);
    await cachePersistor.purge().catch(() => {});
  }
}

// Logout hygiene: clearStore() empties memory, but the disk copy would
// resurrect the previous rider's data on next launch. Both must go together.
export async function purgePersistedCache(): Promise<void> {
  await cachePersistor.purge().catch(() => {});
}

export const client = new ApolloClient({
  link: ApolloLink.from([errorLink, authLink, httpLink]),
  cache,
  // No global watchQuery `cache-and-network` default. A previous version of
  // this file set one, but it silently upgraded EVERY useQuery in the app
  // (dashboard, gear, settings, etc.) to fire a background network request
  // on every mount — disproportionate API load relative to the cases that
  // actually need it. Queries that need fresh data after a deep-link or
  // mutation should opt in explicitly per call site (e.g. ride detail at
  // app/ride/[id].tsx, useCalibrationStateQuery, useRecentRidesQuery).
  // Apollo's per-query default of `cache-first` is the right baseline.
});
