import { useState, useEffect, useCallback } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { Alert } from 'react-native';
import {
  startOAuth,
  getIntegrationStatus,
  disconnectIntegration,
  type IntegrationProvider,
  type IntegrationStatus,
} from '../api/integrations';
import { setOAuthReturnTarget, type OAuthReturnTarget } from '../lib/oauthReturn';

const PROVIDER_LABELS: Record<IntegrationProvider, string> = {
  garmin: 'Garmin',
  strava: 'Strava',
  whoop: 'WHOOP',
  suunto: 'Suunto',
};

export interface UseIntegrationConnectOptions {
  /**
   * Where the OAuth callback should land the rider afterwards. Omit for the
   * callback's default (the onboarding Connect step while onboarding is
   * incomplete, Settings once it is done).
   */
  returnTo?: OAuthReturnTarget;
}

export function useIntegrationConnect(
  provider: IntegrationProvider,
  { returnTo }: UseIntegrationConnectOptions = {}
) {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const providerLabel = PROVIDER_LABELS[provider];

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const result = await getIntegrationStatus(provider);
      setStatus(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get status');
    } finally {
      setLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const connect = useCallback(async () => {
    try {
      setConnecting(true);
      setError(null);

      const { authorizeUrl } = await startOAuth(provider);
      // Recorded just before the browser opens so the callback, which
      // arrives on a deep link with no memory of this screen, can return here.
      setOAuthReturnTarget(returnTo ?? null);
      await WebBrowser.openBrowserAsync(authorizeUrl);

      // Browser was dismissed (user returned) — refresh status
      // The deep link handler may have already triggered a refresh,
      // but this catches the case where the user closes the browser manually
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to connect ${providerLabel}`);
    } finally {
      setConnecting(false);
    }
  }, [provider, providerLabel, refresh, returnTo]);

  const disconnect = useCallback(async () => {
    Alert.alert(
      `Disconnect ${providerLabel}`,
      `Are you sure you want to disconnect your ${providerLabel} account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              setError(null);
              await disconnectIntegration(provider);
              await refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : `Failed to disconnect ${providerLabel}`);
            }
          },
        },
      ]
    );
  }, [provider, providerLabel, refresh]);

  return { status, loading, connecting, error, connect, disconnect, refresh };
}
