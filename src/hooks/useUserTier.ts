import { useMeQuery, type SubscriptionTier, type ComponentType } from '../graphql/generated';
import type { SubscriptionTierName } from '../constants/tiers';

/**
 * Hook for accessing the current user's subscription tier and limits.
 * Mirrors the web app's useUserTier hook (apps/web/src/hooks/useUserTier.ts).
 */
export function useUserTier() {
  const { data, loading, error } = useMeQuery({
    fetchPolicy: 'cache-first',
  });

  const viewer = data?.me;
  const role = viewer?.role as string | undefined;
  const isAdmin = role === 'ADMIN';
  const isFoundingRider = viewer?.isFoundingRider ?? false;

  const tier = (viewer?.subscriptionTier ?? 'FREE_LIGHT') as SubscriptionTierName;
  const isPro = tier === 'PRO' || isAdmin || isFoundingRider;
  const isFree = tier === 'FREE_LIGHT' || tier === 'FREE_FULL';
  const isFreeLight = tier === 'FREE_LIGHT' && !isFoundingRider && !isAdmin;
  const isFreeFull = tier === 'FREE_FULL' && !isFoundingRider && !isAdmin;

  const tierLimits = viewer?.tierLimits ?? null;
  const canAddBike = tierLimits?.canAddBike ?? true;
  const allowedComponentTypes = (tierLimits?.allowedComponentTypes ?? []) as ComponentType[];
  const needsDowngradeSelection = viewer?.needsDowngradeSelection ?? false;
  const referralCode = viewer?.referralCode ?? null;

  return {
    tier,
    isPro,
    isFree,
    isFreeLight,
    isFreeFull,
    isFoundingRider,
    isAdmin,
    canAddBike,
    allowedComponentTypes,
    needsDowngradeSelection,
    referralCode,
    tierLimits,
    loading,
    error,
  };
}
