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

export interface SaveErrorCopy extends ErrorCopy {
  /**
   * The write may have landed despite the error, so the caller must refetch
   * instead of trusting what it has on screen. True only for transport
   * failures: a lost response and a lost request look identical from here.
   */
  resync: boolean;
}

/** Shape of the extensions the API attaches to a RATE_LIMITED rejection. */
interface GraphQLErrorLike {
  extensions?: { code?: string; retryAfter?: number };
}

/**
 * Turn a mutation failure into copy a rider can act on.
 *
 * The load-failure sibling above can promise "nothing has been lost", because
 * a failed read changes nothing. A failed write cannot promise that, and the
 * three outcomes need different words:
 *
 * - Rate limited. The server rejected before touching the row, so the stored
 *   value is unchanged and the only useful information is how long to wait.
 *   `retryAfter` rides along in the error's extensions; the outbox already
 *   reads it (see classifyOutboxError), and an interactive toggle should too
 *   rather than telling the rider "something went wrong" about a limit that
 *   clears itself in seconds.
 * - Transport failure. The request may have committed before the connection
 *   dropped, which is exactly the case that produced a "Failed to update
 *   notification preferences" alert over a preference the server had already
 *   saved. Say the change is uncertain and set `resync` so the caller pulls
 *   the truth back down rather than leaving a control that disagrees with the
 *   server until the next launch.
 * - Anything else. The server answered and refused, so the write did not
 *   happen and the rider has nothing to do but retry.
 *
 * `subject` follows the same rule as describeError: a noun phrase that reads
 * correctly after "your", and never placed in the sentence-subject slot.
 */
export function describeSaveError(error: unknown, subject: string): SaveErrorCopy {
  const retryAfter = rateLimitRetryAfter(error);
  if (retryAfter !== null) {
    const wait =
      retryAfter === 0 ? 'a moment' : `${retryAfter} second${retryAfter === 1 ? '' : 's'}`;
    return {
      title: 'Too many changes',
      // No "nothing was saved" reassurance needed: the limiter rejects before
      // the write, so the previous value is still the stored one.
      body: `You're changing this faster than we can keep up. Try again in ${wait}.`,
      resync: false,
    };
  }

  if (isNetworkError(asErrorish(error))) {
    return {
      title: `Can't reach Loam Logger`,
      body: `Your ${subject} may not have saved. Check your signal and try again.`,
      resync: true,
    };
  }

  return {
    title: `Couldn't save your ${subject}`,
    // "Nothing was changed" rather than "Your ${subject} was not changed":
    // the subject would be the sentence subject there, and "Your notification
    // preferences was not changed" is the same number-agreement break the
    // load-failure copy above was rewritten to avoid. The modal in the
    // transport case ("may not have saved") sidesteps agreement on its own.
    body: `Something went wrong on our end. Nothing was changed. Try again in a moment.`,
    resync: false,
  };
}

/**
 * Seconds the server asked us to wait, or null if this was not a rate limit.
 *
 * Returns 0 rather than null when the code is present without a usable
 * `retryAfter`, so the caller still gets the rate-limit wording (which is the
 * accurate explanation) with a vaguer wait.
 */
function rateLimitRetryAfter(error: unknown): number | null {
  const graphQLErrors = (error as { graphQLErrors?: readonly GraphQLErrorLike[] } | null)
    ?.graphQLErrors;
  const limited = graphQLErrors?.find((e) => e.extensions?.code === 'RATE_LIMITED');
  if (!limited) return null;
  const seconds = limited.extensions?.retryAfter;
  return typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0
    ? Math.ceil(seconds)
    : 0;
}

/** Narrow an unknown throw to the shape isNetworkError can read. */
function asErrorish(error: unknown): ApolloError | Error | undefined {
  return error instanceof Error ? error : undefined;
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
