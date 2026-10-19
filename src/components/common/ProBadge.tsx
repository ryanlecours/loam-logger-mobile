import { StyleSheet, Text } from 'react-native';
import { colors, radius } from '../../constants/theme';

interface ProBadgeProps {
  /** Founding Riders get their own title in place of "Pro". */
  isFoundingRider?: boolean;
}

/**
 * Earned-status badge for Pro riders, mirroring web's ProBadge next to the
 * logo. Amber is reserved for earned status (DESIGN.md, "The Open Gate
 * Rule"); a gated feature wears the sage ProChip from UpgradePrompt instead.
 */
export function ProBadge({ isFoundingRider = false }: ProBadgeProps) {
  const label = isFoundingRider ? 'Founding Rider' : 'Pro';
  return (
    <Text style={styles.badge} accessibilityLabel={`${label} member`}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    overflow: 'hidden',
    borderRadius: radius.full,
    backgroundColor: colors.earnedBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.earned,
  },
});
