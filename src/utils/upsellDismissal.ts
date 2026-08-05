/**
 * Pure set math behind UpsellCard's dismissal / re-arm behavior.
 *
 * A dismissal stores the comma-joined set of re-arm tokens it covered.
 * Legacy dismissals stored the literal '1', which participates as an
 * ordinary token. A card stays dismissed only while every current token is
 * covered, so each NEW token (e.g. a different part crossing its service
 * interval) re-arms the card exactly once, while shrinking or repeating
 * token sets stay dismissed.
 */

/** Parse a rearmKey (comma-joined ids, or undefined for none) into tokens. */
export function rearmTokens(rearmKey: string | undefined): string[] {
  return rearmKey === undefined ? [] : rearmKey.split(',').filter(Boolean);
}

/**
 * Whether a stored dismissal still covers the current re-arm tokens.
 * `stored === null` means never dismissed: not covered. With no rearmKey the
 * token list is empty, so any stored dismissal covers it.
 */
export function isDismissalCovered(stored: string | null, rearmKey: string | undefined): boolean {
  if (stored === null) return false;
  const covered = new Set(stored.split(','));
  return rearmTokens(rearmKey).every((t) => covered.has(t));
}

/**
 * The value to store when dismissing: the union of previously covered tokens,
 * the legacy '1' base marker, and the current tokens.
 */
export function mergeDismissalTokens(stored: string | null, rearmKey: string | undefined): string {
  const covered = new Set(stored ? stored.split(',').filter(Boolean) : []);
  covered.add('1');
  rearmTokens(rearmKey).forEach((t) => covered.add(t));
  return Array.from(covered).join(',');
}
