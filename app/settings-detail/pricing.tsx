import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { useUserTier } from '../../src/hooks/useUserTier';
import { useMeQuery, useCreateCheckoutSessionMutation, useCreateBillingPortalSessionMutation, StripePlan, CheckoutPlatform } from '../../src/graphql/generated';
import { colors } from '../../src/constants/theme';

type BillingPeriod = StripePlan;

const FEATURES = [
  {
    icon: 'bicycle' as const,
    title: 'Unlimited bikes',
    description: 'Track your whole fleet — no limits',
  },
  {
    icon: 'build-outline' as const,
    title: 'All 23+ component types',
    description: 'Chain, cassette, tires, bearings, and more',
  },
  {
    icon: 'analytics-outline' as const,
    title: 'Advanced wear predictions',
    description: 'Know when parts need service before they fail',
  },
  {
    icon: 'notifications-outline' as const,
    title: 'Service interval reminders',
    description: 'Get notified when components are due',
  },
  {
    icon: 'headset-outline' as const,
    title: 'Priority support',
    description: 'Fast responses when you need help',
  },
];

export default function PricingScreen() {
  const router = useRouter();
  const { isPro, isFoundingRider } = useUserTier();
  const { refetch } = useMeQuery({ fetchPolicy: 'cache-first' });
  const [createCheckout, { loading: checkoutLoading }] = useCreateCheckoutSessionMutation();
  const [createPortal, { loading: portalLoading }] = useCreateBillingPortalSessionMutation();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>(StripePlan.Annual);
  const [opening, setOpening] = useState(false);

  const loading = checkoutLoading || portalLoading || opening;

  const handleCheckout = async () => {
    try {
      setOpening(true);
      const { data } = await createCheckout({
        variables: { plan: billingPeriod, platform: CheckoutPlatform.Mobile },
      });
      const url = data?.createCheckoutSession?.url;
      if (url) {
        await WebBrowser.openBrowserAsync(url);
        await refetch();
        router.back();
      }
    } catch {
      Alert.alert('Error', 'Failed to start checkout. Please try again.');
    } finally {
      setOpening(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      setOpening(true);
      const { data } = await createPortal({
        variables: { platform: CheckoutPlatform.Mobile },
      });
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
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: isPro ? 'Your Plan' : 'Upgrade to Pro',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Already Pro */}
        {isPro ? (
          <View style={styles.proState}>
            <Ionicons name="checkmark-circle" size={64} color={colors.good} />
            <Text style={styles.proTitle}>
              {isFoundingRider ? 'Founding Rider' : "You're on Pro!"}
            </Text>
            <Text style={styles.proSubtitle}>
              {isFoundingRider
                ? 'Lifetime Pro access — thank you for your early support!'
                : 'You have access to all features.'}
            </Text>
            {!isFoundingRider && (
              <TouchableOpacity
                style={[styles.manageButton, loading && styles.buttonDisabled]}
                onPress={handleManageBilling}
                disabled={loading}
              >
                {loading ? (
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
        ) : (
          <>
            {/* Hero */}
            <View style={styles.hero}>
              <Text style={styles.heroTitle}>Unlock the full picture</Text>
              <Text style={styles.heroSubtitle}>
                Know exactly when every component needs service — before problems start.
              </Text>
            </View>

            {/* Features */}
            <View style={styles.features}>
              {FEATURES.map((feature) => (
                <View key={feature.title} style={styles.featureRow}>
                  <View style={styles.featureIconContainer}>
                    <Ionicons name={feature.icon} size={22} color={colors.primary} />
                  </View>
                  <View style={styles.featureText}>
                    <Text style={styles.featureTitle}>{feature.title}</Text>
                    <Text style={styles.featureDescription}>{feature.description}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Pricing Toggle */}
            <View style={styles.pricingSection}>
              <View style={styles.toggle}>
                <TouchableOpacity
                  style={[styles.toggleOption, billingPeriod === StripePlan.Annual && styles.toggleOptionActive]}
                  onPress={() => setBillingPeriod(StripePlan.Annual)}
                >
                  <Text style={[styles.toggleText, billingPeriod === StripePlan.Annual && styles.toggleTextActive]}>
                    Annual
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleOption, billingPeriod === StripePlan.Monthly && styles.toggleOptionActive]}
                  onPress={() => setBillingPeriod(StripePlan.Monthly)}
                >
                  <Text style={[styles.toggleText, billingPeriod === StripePlan.Monthly && styles.toggleTextActive]}>
                    Monthly
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.priceDisplay}>
                <Text style={styles.priceAmount}>
                  {billingPeriod === StripePlan.Annual ? '$7.50' : '$9.99'}
                </Text>
                <Text style={styles.pricePeriod}> / month</Text>
              </View>
              {billingPeriod === StripePlan.Annual && (
                <View style={styles.annualDetails}>
                  <Text style={styles.billedText}>Billed annually at $90</Text>
                  <View style={styles.saveBadge}>
                    <Text style={styles.saveBadgeText}>Best Value</Text>
                  </View>
                </View>
              )}
            </View>

            {/* CTA */}
            <TouchableOpacity
              style={[styles.ctaButton, loading && styles.buttonDisabled]}
              onPress={handleCheckout}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.textPrimary} />
              ) : (
                <Text style={styles.ctaText}>
                  {billingPeriod === StripePlan.Annual ? 'Start Pro — $90/yr' : 'Start Pro — $9.99/mo'}
                </Text>
              )}
            </TouchableOpacity>

            <Text style={styles.cancelNote}>Cancel anytime. No lock-in.</Text>
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },

  // Hero
  hero: {
    alignItems: 'center',
    marginBottom: 32,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Features
  features: {
    marginBottom: 32,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
    gap: 14,
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    flex: 1,
    paddingTop: 2,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 19,
  },

  // Pricing
  pricingSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  toggleOption: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  toggleOptionActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },
  toggleTextActive: {
    color: colors.textPrimary,
  },
  priceDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceAmount: {
    fontSize: 44,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  pricePeriod: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  annualDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  billedText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  saveBadge: {
    backgroundColor: colors.goodBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  saveBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.good,
  },

  // CTA
  ctaButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  ctaText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cancelNote: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // Pro state
  proState: {
    alignItems: 'center',
    paddingTop: 48,
  },
  proTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 16,
  },
  proSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 24,
  },
  manageButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
});
