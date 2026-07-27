import { ApolloError } from '@apollo/client';
import { GraphQLError } from 'graphql';

import { describeError } from './errorCopy';

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
