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

export const client = new ApolloClient({
  link: ApolloLink.from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache({ canonizeResults: false }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
  },
});
