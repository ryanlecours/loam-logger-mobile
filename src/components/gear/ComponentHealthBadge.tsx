import { View, Text, StyleSheet } from 'react-native';
import { healthTone, radius, space, type } from '../../constants/theme';

interface ComponentHealthBadgeProps {
  /** Null/undefined (e.g. free-tier gated predictions) renders nothing. */
  status?: string | null;
  size?: 'small' | 'medium';
}

const STATUS_LABELS: Record<string, string> = {
  ALL_GOOD: 'All good',
  DUE_SOON: 'Due soon',
  DUE_NOW: 'Due now',
  OVERDUE: 'Overdue',
};

export function ComponentHealthBadge({ status, size = 'medium' }: ComponentHealthBadgeProps) {
  // No status (free tier hides predictions) — render nothing rather than
  // implying a known state.
  if (!status) return null;

  const tone = healthTone(status);
  const label = STATUS_LABELS[status] ?? 'Unknown';
  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: tone.bg, borderColor: tone.border },
        isSmall && styles.badgeSmall,
      ]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Service status: ${label}`}
    >
      {/* The dot uses the lightened tint, not the base fill: mahogany-light
          reads at only 2.93:1 as an 8px mark on our card surface. */}
      <View style={[styles.dot, { backgroundColor: tone.on }, isSmall && styles.dotSmall]} />
      <Text style={[styles.text, { color: tone.on }, isSmall && styles.textSmall]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: space.hair,
  },
  dot: {
    width: space.md,
    height: space.md,
    borderRadius: radius.full,
  },
  dotSmall: {
    width: space.sm,
    height: space.sm,
    borderRadius: radius.full,
  },
  text: {
    ...type.captionStrong,
    letterSpacing: 0.2,
  },
  // Smaller label, wider tracking, per DESIGN.md's Trail Marker Rule.
  textSmall: type.labelSmall,
});
