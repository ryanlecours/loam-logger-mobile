import { ApolloError } from '@apollo/client';
import { GraphQLError } from 'graphql';

import { describeError, describeSaveError } from './errorCopy';

/** Transport failure: the server was never reached. */
const offlineError = () =>
  new ApolloError({ networkError: new Error('Network request failed') });

/** The server answered, it just answered with an error. */
const serverError = () =>
  new ApolloError({ graphQLErrors: [new GraphQLError('Internal server error')] });

/** A reachable server returning a 500 is our fault, not the rider's signal. */
const httpError = () => {
  const networkError = Object.assign(new Error('Response not successful'), {
    statusCode: 500,
  });
  return new ApolloError({ networkError });
};

// The subjects actually passed at the call sites, spanning the three
// grammatical shapes that broke the original singular-only copy frame.
const SUBJECTS = ['gear', 'ride stats', 'service summary'];

describe('describeError', () => {
  it('never leaks the underlying error message', () => {
    const secretish = new ApolloError({
      graphQLErrors: [new GraphQLError('Variable "$id" of type ID! at bikes.0.predictions')],
    });
    for (const subject of SUBJECTS) {
      const copy = describeError(secretish, subject);
      expect(`${copy.title} ${copy.body}`).not.toContain('Variable');
      expect(`${copy.title} ${copy.body}`).not.toContain('predictions');
    }
  });

  // This is the regression the copy frames were rewritten for. The earlier
  // wording put the subject in the sentence-subject slot, so a plural noun
  // produced "Your ride stats is safe".
  it.each(SUBJECTS)('reads grammatically for the subject %p', (subject) => {
    for (const error of [offlineError(), serverError()]) {
      const { title, body } = describeError(error, subject);
      const text = `${title} ${body}`;
      expect(text).not.toMatch(new RegExp(`${subject} is\\b`));
      expect(text).not.toMatch(new RegExp(`${subject} are\\b`));
      expect(text).not.toMatch(new RegExp(`${subject} has\\b`));
      expect(text).not.toMatch(new RegExp(`${subject} have\\b`));
    }
  });

  it.each(SUBJECTS)('places the subject after "your" for %p', (subject) => {
    const { title, body } = describeError(serverError(), subject);
    expect(`${title} ${body}`).toContain(`your ${subject}`);
  });

  it('tells the rider to check signal only when the server was unreachable', () => {
    expect(describeError(offlineError(), 'gear').body).toContain('signal');
    expect(describeError(serverError(), 'gear').body).not.toContain('signal');
    // A 500 means we answered badly, so sending the rider to look for signal
    // would be wrong advice.
    expect(describeError(httpError(), 'gear').body).not.toContain('signal');
  });

  it('reassures that nothing was lost, whatever the cause', () => {
    for (const error of [offlineError(), serverError(), httpError(), undefined]) {
      expect(describeError(error, 'gear').body).toContain('Nothing has been lost');
    }
  });

  it('still produces usable copy when there is no error object', () => {
    const copy = describeError(undefined, 'gear');
    expect(copy.title.length).toBeGreaterThan(0);
    expect(copy.body.length).toBeGreaterThan(0);
  });
});

/** What the API sends when the mutation limiter rejects a call. */
const rateLimitError = (retryAfter?: number) =>
  new ApolloError({
    graphQLErrors: [
      new GraphQLError('Rate limit exceeded. Try again in 60 seconds.', {
        extensions: { code: 'RATE_LIMITED', ...(retryAfter === undefined ? {} : { retryAfter }) },
      }),
    ],
  });

describe('describeSaveError', () => {
  const SUBJECT = 'notification preferences';

  // The bug this function exists for: the write committed, the response was
  // lost on the way back, and the rider was told flatly that it failed.
  it('admits a dropped connection may still have saved, and asks for a resync', () => {
    const copy = describeSaveError(offlineError(), SUBJECT);
    expect(copy.resync).toBe(true);
    expect(copy.body).toContain('may not have saved');
    expect(copy.body).toContain('signal');
  });

  it('does not claim a change was saved or discarded when it cannot know', () => {
    const copy = describeSaveError(offlineError(), SUBJECT);
    expect(copy.body).not.toContain('Nothing was changed');
    expect(copy.body).not.toContain('Nothing has been lost');
  });

  it('turns a rate limit into the wait the server asked for', () => {
    const copy = describeSaveError(rateLimitError(42), SUBJECT);
    expect(copy.title).toBe('Too many changes');
    expect(copy.body).toContain('42 seconds');
    // The limiter rejects before the write, so the stored value is intact and
    // there is nothing to pull back down.
    expect(copy.resync).toBe(false);
  });

  it('says "1 second", not "1 seconds"', () => {
    expect(describeSaveError(rateLimitError(1), SUBJECT).body).toContain('1 second.');
  });

  it('rounds a fractional wait up rather than promising it early', () => {
    expect(describeSaveError(rateLimitError(2.4), SUBJECT).body).toContain('3 seconds');
  });

  it('keeps the rate-limit wording when retryAfter is missing or unusable', () => {
    for (const err of [rateLimitError(), rateLimitError(0), rateLimitError(NaN)]) {
      const copy = describeSaveError(err, SUBJECT);
      expect(copy.title).toBe('Too many changes');
      expect(copy.body).toContain('a moment');
      expect(copy.body).not.toContain('NaN');
    }
  });

  it('states plainly that a server refusal changed nothing', () => {
    const copy = describeSaveError(serverError(), SUBJECT);
    expect(copy.body).toContain('Nothing was changed');
    expect(copy.resync).toBe(false);
    expect(copy.body).not.toContain('signal');
  });

  // A 500 is us answering badly, not the rider's signal, and the request did
  // reach us, so it is not the ambiguous case either.
  it('treats a reachable server returning 500 as our fault, not a lost request', () => {
    const copy = describeSaveError(httpError(), SUBJECT);
    expect(copy.resync).toBe(false);
    expect(copy.body).not.toContain('signal');
  });

  it('never leaks the underlying error message', () => {
    const leaky = new ApolloError({
      graphQLErrors: [new GraphQLError('Variable "$input" of type UpdateUserPreferencesInput!')],
    });
    const copy = describeSaveError(leaky, SUBJECT);
    expect(`${copy.title} ${copy.body}`).not.toContain('UpdateUserPreferencesInput');
  });

  it('survives a throw that is not an Error at all', () => {
    for (const thrown of [undefined, null, 'boom', { nope: true }]) {
      const copy = describeSaveError(thrown, SUBJECT);
      expect(copy.title.length).toBeGreaterThan(0);
      expect(copy.body.length).toBeGreaterThan(0);
      expect(copy.resync).toBe(false);
    }
  });

  it.each(['notification preferences', 'prediction mode', 'AI preference'])(
    'places the subject after "your" for %p',
    (subject) => {
      for (const err of [offlineError(), serverError()]) {
        const { title, body } = describeSaveError(err, subject);
        const text = `${title} ${body}`;
        expect(text.toLowerCase()).toContain(`your ${subject.toLowerCase()}`);
        expect(text).not.toMatch(new RegExp(`${subject} (is|are|was|were|has|have)\\b`));
      }
    }
  );
});
