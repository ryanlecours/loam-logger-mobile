export interface HeadlineCounts {
  /** Bikes with at least one component needing work. */
  attentionCount: number;
  /** Bikes whose tracked components are all within interval. */
  healthyCount: number;
  /** Bikes with nothing tracked at all. Not healthy: unknown. */
  untrackedCount: number;
  /** Every bike the rider owns, including untracked ones. */
  totalBikes: number;
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

  // Nothing flagged and nothing unknown. The only case that earns the all-clear.
  if (untrackedCount === 0) {
    return {
      tone: 'good',
      text: single ? 'Good to go' : `All ${totalBikes} bikes are good to go`,
    };
  }

  // Nothing flagged because nothing is tracked. There is no finding here, and
  // saying so is the honest answer.
  if (healthyCount === 0) {
    return {
      tone: 'neutral',
      text: single ? 'Nothing tracked on this bike yet' : 'Nothing tracked on your bikes yet',
    };
  }

  // Some known-good, some unknown. Claim only the part that is actually known;
  // the untracked row below names the rest.
  return {
    tone: 'neutral',
    text: `${healthyCount} of your ${totalBikes} bikes are good to go`,
  };
}
