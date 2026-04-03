import { useCallback } from 'react';
import { useAuth } from './useAuth';
import { useUpdateUserPreferencesMutation } from '../graphql/generated';
import { formatDistance } from '../utils/greetingMessages';

export type DistanceUnit = 'mi' | 'km';

const MI_TO_M = 1609.344;
const KM_TO_M = 1000;

export function useDistanceUnit() {
  const { user, refetchUser } = useAuth();
  const [updatePreferences] = useUpdateUserPreferencesMutation();

  const distanceUnit: DistanceUnit =
    user?.distanceUnit === 'km' ? 'km' : 'mi';

  const setDistanceUnit = useCallback(
    async (unit: DistanceUnit) => {
      await updatePreferences({
        variables: { input: { distanceUnit: unit } },
      });
      await refetchUser();
    },
    [updatePreferences, refetchUser]
  );

  /** Format meters into the user's preferred unit string */
  const fmtDistance = useCallback(
    (meters: number) => formatDistance(meters, distanceUnit),
    [distanceUnit]
  );

  /** Convert a value in the user's preferred unit to meters (for saving to API) */
  const toMeters = useCallback(
    (value: number) =>
      distanceUnit === 'km' ? value * KM_TO_M : value * MI_TO_M,
    [distanceUnit]
  );

  /** Convert meters to the user's preferred unit (for displaying in inputs) */
  const fromMeters = useCallback(
    (meters: number) =>
      distanceUnit === 'km' ? meters / KM_TO_M : meters / MI_TO_M,
    [distanceUnit]
  );

  return {
    distanceUnit,
    setDistanceUnit,
    formatDistance: fmtDistance,
    toMeters,
    fromMeters,
    unitLabel: distanceUnit,
  };
}
