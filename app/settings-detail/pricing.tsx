import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter, Href } from 'expo-router';
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

  // Free users see RevenueCat Paywall
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Upgrade to Pro', headerShown: false }} />
      <RevenueCatUI.Paywall
        onPurchaseCompleted={async () => {
          await refetch();
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)/settings');
          }
        }}
        onRestoreCompleted={async () => {
          await refetch();
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)/settings');
          }
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
});
