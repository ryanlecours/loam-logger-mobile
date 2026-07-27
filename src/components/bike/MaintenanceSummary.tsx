import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Sentry from '@sentry/react-native';
import { useBikeAdvisorSummaryQuery } from '../../graphql/generated';
import { colors } from '../../constants/theme';
import { GarminDerivedNote } from '../attribution/GarminAttribution';

interface MaintenanceSummaryProps {
  bikeId: string;
}

/**
 * Read-only, natural-language summary of what needs service on this bike.
 *
 * Server side: apps/api/src/services/advisor/summarize.ts. The advisor
 * short-circuits to null for free-tier users, empty-components bikes, and
 * bikes whose overallStatus is ALL_GOOD (the ComponentHealthBadge on the
 * hero already conveys that state). This component renders NOTHING in any
 * of those cases — the widget collapses rather than showing a placeholder.
 *
 * The one affordance we do always render when text is present is the
 * "Machine-generated using AI" caption + sparkle icon at the bottom. That
 * matches terms §9.1 and EU AI Act transparency norms; the user can never
 * mistake the summary prose for human-authored maintenance advice.
 */
export function MaintenanceSummary({ bikeId }: MaintenanceSummaryProps) {
  const { data, loading, error } = useBikeAdvisorSummaryQuery({
    variables: { id: bikeId },
    fetchPolicy: 'cache-and-network',
    // No `skip` here — parent screen gates on isPro + non-empty components.
    // Server returns null when its own tier / trivial-state checks decline
    // to produce a summary, so we defensively handle that below too.
  });

  // The resolver returns null on every known failure path (SDK error,
  // timeout, rate limit, tier gate), so a truthy `error` here is
  // genuinely unexpected — a GraphQL schema mismatch, a transport-level
  // problem the global errorLink didn't fully handle, or a server bug.
  // Log to Sentry so we hear about it; the UI still degrades to nothing
  // via the `summary?.text` check below.
  useEffect(() => {
    if (!error) return;
    Sentry.addBreadcrumb({
      category: 'advisor',
      type: 'error',
      level: 'warning',
      message: 'MaintenanceSummary query error',
      data: {
        bikeId,
        graphQLError: error.graphQLErrors[0]?.message,
        networkError: error.networkError?.message,
      },
    });
    Sentry.captureMessage(
      `MaintenanceSummary query failed: ${error.message}`,
      'warning'
    );
  }, [error, bikeId]);

  const summary = data?.bike?.predictions?.advisorSummary;
  // This summary is LLM output built from predictions, which are built from
  // ride duration. Where Garmin rides contributed those hours, the Garmin API
  // Brand Guidelines require Garmin to be named as a contributing source for
  // any output "influenced materially by Garmin device-sourced data". Stays
  // false for bikes with no Garmin rides: the guidelines equally forbid Garmin
  // branding where its data is absent.
  const hasGarminSource = data?.bike?.contributingSources?.includes('garmin') ?? false;

  if (loading && !summary) {
    return (
      <View style={styles.section}>
        <View style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
      </View>
    );
  }

  if (!summary?.text) {
    // Free-tier user, empty bike, trivial state (ALL_GOOD), or transient
    // server-side failure. Widget disappears; the space collapses.
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.summaryText}>{summary.text}</Text>
      <View style={styles.footer}>
        <Ionicons
          name="sparkles-outline"
          size={11}
          color={colors.textMuted}
          accessibilityElementsHidden
        />
        <Text style={styles.footerText}>Machine-generated using AI</Text>
      </View>
      {hasGarminSource && <GarminDerivedNote style={styles.attribution} />}
    </View>
  );
}

const styles = StyleSheet.create({
  attribution: {
    marginTop: 6,
  },
  section: {
    marginTop: 16,
    marginHorizontal: 16,
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
  },
  footerText: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  // Skeleton — static gray lines. If perceived latency ever becomes an issue
  // (Haiku is fast enough that it usually doesn't), swap for an Animated
  // shimmer. Two lines because the prompt caps output at 1–2 sentences.
  skeletonLine: {
    height: 14,
    backgroundColor: colors.cardBorder,
    borderRadius: 4,
    marginTop: 4,
  },
  skeletonLineShort: {
    width: '60%',
  },
});
