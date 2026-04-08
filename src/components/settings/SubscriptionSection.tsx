import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter, Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { useUserTier } from '../../hooks/useUserTier';
import { useMeQuery, useCreateBillingPortalSessionMutation, CheckoutPlatform } from '../../graphql/generated';
import { colors } from '../../constants/theme';

export function SubscriptionSection() {
  const router = useRouter();
  const { tier, isPro, isFoundingRider, subscriptionProvider } = useUserTier();
  const { refetch } = useMeQuery({ fetchPolicy: 'cache-first' });
  const [createPortal, { loading: portalLoading }] = useCreateBillingPortalSessionMutation();
  const [opening, setOpening] = useState(false);
  const loading = portalLoading || opening;

  const handleManage = async () => {
    if (subscriptionProvider === 'APPLE' || subscriptionProvider === 'GOOGLE') {
      router.push('/settings-detail/customer-center' as Href);
    } else {
      // Stripe subscriber — open billing portal
      try {
        setOpening(true);
        const { data } = await createPortal({ variables: { platform: CheckoutPlatform.Mobile } });
        const url = data?.createBillingPortalSession?.url;
        if (url) {
          await WebBrowser.openBrowserAsync(url);
          await refetch();
        }
      } catch {
        Alert.alert('Error', 'Failed to open billing portal. Please try again.');
      } finally {
        setOpening(false);
      }
    }
  };

  const tierLabel = isFoundingRider
    ? 'Founding Rider (Lifetime Pro)'
    : tier === 'PRO'
      ? 'Pro'
      : 'Free';

  const tierSubtitle = isFoundingRider
    ? 'Lifetime access — thank you for your early support!'
    : isPro
      ? 'Unlimited bikes and all components'
      : 'Upgrade for unlimited bikes and components';

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Subscription</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Ionicons name="card-outline" size={20} color={colors.textSecondary} />
          <View style={styles.info}>
            <Text style={styles.tierLabel}>{tierLabel}</Text>
            <Text style={styles.tierSubtitle}>{tierSubtitle}</Text>
          </View>
        </View>

        {!isPro && (
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => router.push('/settings-detail/pricing' as Href)}
          >
            <Ionicons name="arrow-up-circle-outline" size={18} color={colors.textPrimary} />
            <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
          </TouchableOpacity>
        )}

        {isPro && !isFoundingRider && (
          <TouchableOpacity
            style={[styles.manageButton, loading && styles.buttonDisabled]}
            onPress={handleManage}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Text style={styles.manageButtonText}>Manage</Text>
                <Ionicons name="open-outline" size={14} color={colors.primary} />
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  info: {
    flex: 1,
  },
  tierLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  tierSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 16,
  },
  upgradeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 16,
  },
  manageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
