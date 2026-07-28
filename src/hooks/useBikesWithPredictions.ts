import { useGearLightQuery, useGearQuery } from '../graphql/generated';

/**
 * Two-phase loading hook for bikes with predictions.
 *
 * Phase 1: Load bikes without predictions (fast)
 * Phase 2: Load bikes with predictions in background
 *
 * This ensures the UI renders quickly with basic bike data,
 * then enriches with prediction data when available.
 */
export function useBikesWithPredictions() {
  // Phase 1: Fast load without predictions
  const lightQuery = useGearLightQuery({
    fetchPolicy: 'cache-and-network',
  });

  // Phase 2: Full load with predictions (skip until light loads)
  const fullQuery = useGearQuery({
    skip: !lightQuery.data,
    fetchPolicy: 'cache-and-network',
  });

  // Use full data if available, fall back to light data
  const bikes = fullQuery.data?.bikes || lightQuery.data?.bikes || [];

  return {
    bikes,
    spareComponents: lightQuery.data?.spareComponents || [],
    loading: lightQuery.loading && !lightQuery.data,
    predictionsLoading: fullQuery.loading,
    hasPredictions: !!fullQuery.data,
    error: lightQuery.error || fullQuery.error,
    /**
     * Surfaced separately because the two failures need different UI. A failed
     * light query means "we have no bikes to show". A failed predictions query
     * means "we have your bikes but cannot say whether they are ready", and a
     * caller that only checks the merged `error` alongside `bikes.length` will
     * silently render a clean bill of health for a query that never answered.
     */
    predictionsError: fullQuery.error,
    refetch: async () => {
      await Promise.all([
        lightQuery.refetch(),
        fullQuery.refetch(),
      ]);
    },
  };
}
