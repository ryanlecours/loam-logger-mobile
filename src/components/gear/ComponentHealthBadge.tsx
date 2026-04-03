import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../constants/theme';

interface ComponentHealthBadgeProps {
  status: string;
  size?: 'small' | 'medium';
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  ALL_GOOD: { bg: colors.goodBg, text: colors.good, label: 'Good' },
  DUE_SOON: { bg: colors.monitorBg, text: colors.monitor, label: 'Due Soon' },
  DUE_NOW: { bg: colors.warningBg, text: colors.warning, label: 'Due Now' },
  OVERDUE: { bg: colors.dangerBg, text: colors.danger, label: 'Overdue' },
  UNKNOWN: { bg: 'rgba(156, 163, 175, 0.15)', text: colors.unknown, label: 'Unknown' },
};

export function ComponentHealthBadge({ status, size = 'medium' }: ComponentHealthBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.UNKNOWN;
  const isSmall = size === 'small';

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }, isSmall && styles.badgeSmall]}>
      <Text style={[styles.text, { color: config.text }, isSmall && styles.textSmall]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
  textSmall: {
    fontSize: 11,
  },
});
