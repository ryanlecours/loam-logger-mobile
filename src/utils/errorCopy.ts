import type { ApolloError } from '@apollo/client';

export interface ErrorCopy {
  /** What went wrong, in the rider's terms. */
  title: string;
  /** What they can do about it. Never a stack trace or a GraphQL message. */
  body: string;
}

/**
 * Turn a query failure into copy a rider can act on.
 *
 * Deliberately never surfaces `error.message`. A GraphQL or transport message
 * names our internals, not the rider's problem, and on a trailhead LTE
 * connection the only useful information is "we could not reach the server,
 * your data is safe, try again".
 *
 * The distinction that matters to a rider is offline vs. our fault, because it
 * tells them whether moving somewhere with signal will help.
 */
export function describeError(error: ApolloError | Error | undefined, subject: string): ErrorCopy {
  const offline = isNetworkError(error);
  if (offline) {
    return {
      title: `Can't reach Loam Logger`,
      body: `Your ${subject} is safe, we just couldn't load it. Check your signal and try again.`,
    };
  }
  return {
    title: `Couldn't load your ${subject}`,
    body: `Something went wrong on our end. Nothing has been lost. Try again in a moment.`,
  };
}

function isNetworkError(error: ApolloError | Error | undefined): boolean {
  if (!error) return false;
  if ('networkError' in error && error.networkError) {
    // A server that answered with a GraphQL error list is reachable; only a
    // transport failure means the rider is genuinely offline.
    const ne = error.networkError as { statusCode?: number };
    return ne.statusCode === undefined;
  }
  const message = error.message?.toLowerCase() ?? '';
  return (
    message.includes('network request failed') ||
    message.includes('failed to fetch') ||
    message.includes('timeout')
  );
}
