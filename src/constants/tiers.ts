/**
 * Tier constants — duplicated from libs/shared/src/tiers.ts
 * Keep in sync with the source when modifying tier definitions.
 */

export const FREE_LIGHT_COMPONENT_TYPES = [
  'FORK',
  'SHOCK',
  'BRAKE_PAD',
  'PIVOT_BEARINGS',
] as const;

export type SubscriptionTierName = 'FREE_LIGHT' | 'FREE_FULL' | 'PRO';

export const TIER_DISPLAY_NAMES: Record<SubscriptionTierName, string> = {
  FREE_LIGHT: 'Free',
  FREE_FULL: 'Free',
  PRO: 'Pro',
};

export const ANALYSIS_LEVEL_NAMES: Record<SubscriptionTierName, string> = {
  FREE_LIGHT: 'Light Bike Analysis',
  FREE_FULL: 'Full Bike Analysis',
  PRO: 'Full Bike Analysis',
};
