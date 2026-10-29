export interface HeadlineCounts {
  /** Bikes with at least one component needing work. */
  attentionCount: number;
  /** Bikes whose tracked components are all within interval. */
  healthyCount: number;
  /** Bikes with nothing tracked at all. Not healthy: unknown. */
  untrackedCount: number;
  /** Every bike the rider owns, including untracked ones. */
  totalBikes: number;
  /**
   * The account has no rides at all (see isFirstRun). Nothing has moved a
   * clock yet, so "nothing flagged" is absence of evidence, not an all-clear.
   */
  firstRun?: boolean;
}

export interface Headline {
  text: string;
  /** `good` earns the mint ink. Only a true all-clear does. */
  tone: 'good' | 'neutral';
}

/**
 * The one line at the top of the dashboard, decided from counts alone.
 *
 * Pulled out of the screen because the rule it encodes is the same one the
 * whole triage exists to protect: **an all-clear must be gated on there being
 * nothing unknown, not merely nothing flagged.** A bike with no components
 * tracked produces no findings, so keying the all-clear off the attention count
 * alone prints "All 3 bikes are good to go" directly above a row that reads
 * "No components tracked on Hightower". Absence of evidence rendered as
 * evidence of absence is the exact defect this screen was rebuilt to remove;
 * it does not get to come back in through the headline.
 */
export function dashboardHeadline({
  attentionCount,
  healthyCount,
  untrackedCount,
  totalBikes,
  firstRun = false,
}: HeadlineCounts): Headline {
  const single = totalBikes === 1;

  if (attentionCount > 0) {
    return {
      tone: 'neutral',
      text: single
        ? 'Needs attention before you ride'
        : `${attentionCount} of your ${totalBikes} bikes need work`,
    };
  }

  // Nothing flagged because nothing is tracked. There is no finding here, and
  // saying so is the honest answer. Checked before the first-run case because
  // adding components is the step that unblocks this rider, not riding.
  if (untrackedCount > 0 && healthyCount === 0) {
    return {
      tone: 'neutral',
      text: single ? 'Nothing tracked on this bike yet' : 'Nothing tracked on your bikes yet',
    };
  }

  // Parts are tracked but no ride has ever landed, so every clock reads zero.
  // Zero hours is not health, it is no data: the ride source card below says
  // what the rider is waiting on (a connection, an import, a first ride), and
  // "good to go" here would contradict it.
  if (firstRun) {
    return {
      tone: 'neutral',
      text: single ? 'Nothing on the clock yet' : 'Nothing on the clock for your bikes yet',
    };
  }

  // Nothing flagged and nothing unknown. The only case that earns the all-clear.
  if (untrackedCount === 0) {
    return {
      tone: 'good',
      text: single ? 'Good to go' : `All ${totalBikes} bikes are good to go`,
    };
  }

  // Some known-good, some unknown. Claim only the part that is actually known;
  // the untracked row below names the rest.
  return {
    tone: 'neutral',
    text: `${healthyCount} of your ${totalBikes} bikes are good to go`,
  };
}
