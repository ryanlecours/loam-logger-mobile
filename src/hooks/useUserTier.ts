import { useMeQuery, type ComponentType, type SubscriptionProvider } from '../graphql/generated';
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

  const tier = (viewer?.subscriptionTier ?? 'FREE') as SubscriptionTierName;
  const isPro = tier === 'PRO' || isAdmin || isFoundingRider;
  const isFree = tier !== 'PRO' && !isAdmin && !isFoundingRider;

  const subscriptionProvider: SubscriptionProvider | null = viewer?.subscriptionProvider ?? null;
  const tierLimits = viewer?.tierLimits ?? null;
  const canAddBike = tierLimits?.canAddBike ?? true;
  const allowedComponentTypes = (tierLimits?.allowedComponentTypes ?? []) as ComponentType[];
  const needsDowngradeSelection = viewer?.needsDowngradeSelection ?? false;

  return {
    tier,
    isPro,
    isFree,
    isFoundingRider,
    isAdmin,
    subscriptionProvider,
    canAddBike,
    allowedComponentTypes,
    needsDowngradeSelection,
    tierLimits,
    loading,
    error,
  };
}
