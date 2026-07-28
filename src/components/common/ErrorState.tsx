import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, space, type } from '../../constants/theme';

interface ErrorStateProps {
  title: string;
  body: string;
  onRetry?: () => void;
  /** True while a retry is in flight, so the control can't be double-fired. */
  retrying?: boolean;
  /**
   * `screen` owns the viewport when the whole surface failed.
   * `card` sits inline where one widget failed and the rest of the page is fine.
   */
  variant?: 'screen' | 'card';
}

/**
 * The one place a failed read is allowed to surface.
 *
 * A silent `return null` on error is what let the dashboard tell riders with
 * four bikes that they owned none. Every read that can fail renders this
 * instead, so a failure is always distinguishable from an empty state.
 */
export function ErrorState({
  title,
  body,
  onRetry,
  retrying = false,
  variant = 'screen',
}: ErrorStateProps) {
  const isCard = variant === 'card';
  return (
    <View
      style={[styles.base, isCard ? styles.card : styles.screen]}
      accessible
      accessibilityRole="alert"
      accessibilityLabel={`${title}. ${body}`}
    >
      <Ionicons
        name="cloud-offline-outline"
        size={isCard ? 22 : 40}
        color={colors.textSecondary}
        accessibilityElementsHidden
      />
      <Text style={[isCard ? styles.cardTitle : styles.screenTitle]}>{title}</Text>
      <Text style={[styles.body, isCard && styles.bodyCard]}>{body}</Text>
      {onRetry && (
        <TouchableOpacity
          style={[styles.retry, retrying && styles.retryBusy]}
          onPress={onRetry}
          disabled={retrying}
          accessibilityRole="button"
          accessibilityLabel="Try again"
          accessibilityState={{ disabled: retrying }}
        >
          {retrying ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <Text style={styles.retryText}>Try again</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
  },
  screen: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: space.section,
    gap: space.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: space.xl,
    gap: space.md,
  },
  screenTitle: {
    ...type.subtitle,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  cardTitle: {
    ...type.calloutStrong,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  body: {
    ...type.footnote,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  bodyCard: {
    ...type.caption,
    lineHeight: 18,
  },
  retry: {
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: space.xxl,
    paddingVertical: space.lg,
    borderRadius: radius.full,
    marginTop: space.xs,
  },
  retryBusy: {
    opacity: 0.6,
  },
  retryText: {
    ...type.footnoteStrong,
    color: colors.onPrimary,
  },
});
