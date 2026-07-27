import { View, Text, StyleSheet } from 'react-native';
import { colors, healthTone } from '../../constants/theme';

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
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  textSmall: {
    fontSize: 11,
  },
});
