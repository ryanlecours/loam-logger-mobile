/**
 * Tier constants — duplicated from libs/shared/src/tiers.ts
 * Keep in sync with the source when modifying tier definitions.
 */

export type SubscriptionTierName = 'FREE' | 'PRO';

export const TIER_DISPLAY_NAMES: Record<SubscriptionTierName, string> = {
  FREE: 'Free',
  PRO: 'Pro',
};
