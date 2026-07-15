import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBikeAdvisorSummaryQuery } from '../../graphql/generated';
import { colors } from '../../constants/theme';

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
  const { data, loading } = useBikeAdvisorSummaryQuery({
    variables: { id: bikeId },
    fetchPolicy: 'cache-and-network',
    // No `skip` here — parent screen gates on isPro + non-empty components.
    // Server returns null when its own tier / trivial-state checks decline
    // to produce a summary, so we defensively handle that below too.
  });

  const summary = data?.bike?.predictions?.advisorSummary;

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
    </View>
  );
}

const styles = StyleSheet.create({
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
