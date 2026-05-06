import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter, Href, Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import RevenueCatUI from 'react-native-purchases-ui';
import { Ionicons } from '@expo/vector-icons';
import { useUserTier } from '../../src/hooks/useUserTier';
import { useMeQuery, useCreateBillingPortalSessionMutation, CheckoutPlatform } from '../../src/graphql/generated';
import { colors } from '../../src/constants/theme';

export default function PricingScreen() {
  const router = useRouter();
  const { isPro, isFoundingRider, subscriptionProvider } = useUserTier();
  const { refetch } = useMeQuery({ fetchPolicy: 'cache-first' });
  const [createPortal, { loading: portalLoading }] = useCreateBillingPortalSessionMutation();
  const [managingStripe, setManagingStripe] = useState(false);

  const handleManage = async () => {
    if (subscriptionProvider === 'APPLE' || subscriptionProvider === 'GOOGLE') {
      router.push('/settings-detail/customer-center' as Href);
    } else {
      // Stripe subscriber — open billing portal
      try {
        setManagingStripe(true);
        const { data } = await createPortal({ variables: { platform: CheckoutPlatform.Mobile } });
        const url = data?.createBillingPortalSession?.url;
        if (url) {
          await WebBrowser.openBrowserAsync(url);
          await refetch();
        }
      } catch {
        Alert.alert('Error', 'Failed to open billing portal. Please try again.');
      } finally {
        setManagingStripe(false);
      }
    }
  };

  // Pro users see status screen
  if (isPro) {
    const manageLoading = portalLoading || managingStripe;

    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Pro' }} />
        <View style={styles.proContent}>
          <View style={styles.proIconContainer}>
            <Ionicons name="checkmark-circle" size={64} color={colors.good} />
          </View>
          <Text style={styles.proTitle}>
            {isFoundingRider ? 'Founding Rider' : "You're on Pro!"}
          </Text>
          <Text style={styles.proSubtitle}>
            {isFoundingRider
              ? 'Lifetime access — thank you for your early support!'
              : 'Unlimited bikes, all components, and advanced predictions'}
          </Text>

          {!isFoundingRider && (
            <TouchableOpacity
              style={[styles.manageButton, manageLoading && styles.buttonDisabled]}
              onPress={handleManage}
              disabled={manageLoading}
            >
              {manageLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Text style={styles.manageButtonText}>Manage Subscription</Text>
                  <Ionicons name="open-outline" size={14} color={colors.primary} />
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // Free users see RevenueCat Paywall with required legal links beneath.
  // Apple requires apps offering auto-renewable subscriptions to display
  // functional links to the Terms of Use (EULA) and Privacy Policy on the
  // purchase screen itself — see App Store Review Guideline 3.1.2(a).
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Upgrade to Pro', headerShown: false }} />
      <View style={styles.paywallContainer}>
        <RevenueCatUI.Paywall
          onPurchaseCompleted={async () => {
            await refetch();
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/settings');
            }
          }}
          onPurchaseError={({ error }) => {
            Alert.alert('Purchase Failed', error.message || 'Please try again.');
          }}
          onRestoreCompleted={async () => {
            await refetch();
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/settings');
            }
          }}
          onRestoreError={({ error }) => {
            Alert.alert('Restore Failed', error.message || 'Please try again.');
          }}
          onDismiss={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/settings');
            }
          }}
        />
      </View>
      <View style={styles.legalFooter}>
        <Text style={styles.legalText}>
          Subscriptions auto-renew unless cancelled at least 24 hours before the end of the current period. Manage or cancel in your Apple ID settings.
        </Text>
        <View style={styles.legalLinks}>
          <Link href={'/settings-detail/terms' as Href} style={styles.legalLink}>
            Terms of Use
          </Link>
          <Text style={styles.legalSeparator}>·</Text>
          <Link href={'/settings-detail/privacy-policy' as Href} style={styles.legalLink}>
            Privacy Policy
          </Link>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  proContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  proIconContainer: {
    marginBottom: 16,
  },
  proTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  proSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  manageButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  paywallContainer: {
    flex: 1,
  },
  legalFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
  },
  legalText: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 15,
    marginBottom: 8,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  legalLink: {
    fontSize: 12,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
