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
 * nothing is lost, try again".
 *
 * The distinction that matters to a rider is offline vs. our fault, because it
 * tells them whether moving somewhere with signal will help.
 *
 * `subject` is a noun phrase that has to read correctly after "your", and it
 * is only ever placed there. An earlier version wrote "Your ${subject} is
 * safe", which silently produced "Your ride stats is safe" for every plural
 * subject. The frames below never make the subject a sentence subject, so no
 * number agreement is involved and no pluralization logic is needed: "gear"
 * (mass), "ride stats" (plural) and "service summary" (singular) all read
 * correctly without the caller flagging which is which.
 */
export function describeError(error: ApolloError | Error | undefined, subject: string): ErrorCopy {
  if (isNetworkError(error)) {
    return {
      title: `Can't reach Loam Logger`,
      body: `We couldn't load your ${subject}. Nothing has been lost. Check your signal and try again.`,
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
