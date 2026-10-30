import { useCallback } from 'react';
import { useAuth } from './useAuth';
import { useUpdateUserPreferencesMutation } from '../graphql/generated';
import { DEFAULT_CURRENCY, isSupportedCurrency, type CurrencyCode } from '../lib/money';

/**
 * The currency new costs are entered in. Mirrors useDistanceUnit: read from
 * the signed-in user, written through updateUserPreferences, USD until the
 * rider picks one. Every stored amount still carries its own code, so this
 * only decides what new entries default to and which currency totals sum.
 */
export function useCurrency() {
  const { user, refetchUser } = useAuth();
  const [updatePreferences] = useUpdateUserPreferencesMutation();

  const stored = (user as { currency?: string | null } | null | undefined)?.currency;
  const currency: CurrencyCode = isSupportedCurrency(stored) ? stored : DEFAULT_CURRENCY;
  const isSet = isSupportedCurrency(stored);

  const setCurrency = useCallback(
    async (code: CurrencyCode) => {
      await updatePreferences({ variables: { input: { currency: code } } });
      await refetchUser();
    },
    [updatePreferences, refetchUser]
  );

  return { currency, isSet, setCurrency };
}
