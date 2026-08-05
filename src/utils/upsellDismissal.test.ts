import { isDismissalCovered, mergeDismissalTokens, rearmTokens } from './upsellDismissal';

/**
 * These pin the dismissal / re-arm contract from the UpsellCard docstring:
 * legacy '1' markers keep old dismissals honored, each NEW token re-arms the
 * card exactly once, and shrinking or repeating token sets stay dismissed.
 */

describe('rearmTokens', () => {
  it('returns no tokens for an undefined rearmKey', () => {
    expect(rearmTokens(undefined)).toEqual([]);
  });

  it('splits a comma-joined key and drops empty segments', () => {
    expect(rearmTokens('fork-1,shock-2')).toEqual(['fork-1', 'shock-2']);
    expect(rearmTokens('')).toEqual([]);
    expect(rearmTokens('fork-1,')).toEqual(['fork-1']);
  });
});

describe('isDismissalCovered', () => {
  it('is never covered before any dismissal', () => {
    expect(isDismissalCovered(null, undefined)).toBe(false);
    expect(isDismissalCovered(null, 'fork-1')).toBe(false);
  });

  it('treats any stored dismissal as covering the no-rearm state', () => {
    expect(isDismissalCovered('1', undefined)).toBe(true);
    expect(isDismissalCovered('1,fork-1', undefined)).toBe(true);
  });

  it('re-arms a legacy "1" dismissal when a token appears', () => {
    expect(isDismissalCovered('1', 'fork-1')).toBe(false);
  });

  it('stays dismissed while every current token is covered', () => {
    expect(isDismissalCovered('1,fork-1', 'fork-1')).toBe(true);
  });

  it('re-arms once per NEW token, not once globally', () => {
    // Dismissed while fork-1 was past interval; shock-2 crossing re-arms.
    expect(isDismissalCovered('1,fork-1', 'fork-1,shock-2')).toBe(false);
    // After dismissing again, the grown set is covered.
    expect(isDismissalCovered('1,fork-1,shock-2', 'fork-1,shock-2')).toBe(true);
  });

  it('keeps shrinking token sets dismissed (a serviced part is not a fresh reason)', () => {
    expect(isDismissalCovered('1,fork-1,shock-2', 'shock-2')).toBe(true);
  });

  it('keeps the base dismissal when the rearm condition clears entirely', () => {
    expect(isDismissalCovered('1,fork-1', undefined)).toBe(true);
  });
});

describe('mergeDismissalTokens', () => {
  it('stores the base marker for a plain dismissal', () => {
    expect(mergeDismissalTokens(null, undefined)).toBe('1');
  });

  it('stores the base marker plus the current tokens', () => {
    expect(mergeDismissalTokens(null, 'fork-1').split(',').sort()).toEqual(['1', 'fork-1']);
  });

  it('unions with previously covered tokens instead of replacing them', () => {
    const merged = mergeDismissalTokens('1,fork-1', 'shock-2').split(',').sort();
    expect(merged).toEqual(['1', 'fork-1', 'shock-2']);
  });

  it('is idempotent for repeated tokens', () => {
    const merged = mergeDismissalTokens('1,fork-1', 'fork-1').split(',').sort();
    expect(merged).toEqual(['1', 'fork-1']);
  });

  it('round-trips with isDismissalCovered', () => {
    // Whatever was just dismissed is covered immediately afterwards.
    const stored = mergeDismissalTokens('1,fork-1', 'fork-1,shock-2');
    expect(isDismissalCovered(stored, 'fork-1,shock-2')).toBe(true);
    // ...and a later, previously unseen token still re-arms.
    expect(isDismissalCovered(stored, 'fork-1,wheel-3')).toBe(false);
  });
});
