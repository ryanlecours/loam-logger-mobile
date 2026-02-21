import { View, Text, StyleSheet } from 'react-native';

interface ComponentHealthBadgeProps {
  status: string;
  size?: 'small' | 'medium';
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  ALL_GOOD: { bg: '#dcfce7', text: '#166534', label: 'Good' },
  DUE_SOON: { bg: '#fef9c3', text: '#854d0e', label: 'Due Soon' },
  DUE_NOW: { bg: '#fed7aa', text: '#9a3412', label: 'Due Now' },
  OVERDUE: { bg: '#fecaca', text: '#991b1b', label: 'Overdue' },
  UNKNOWN: { bg: '#e5e7eb', text: '#6b7280', label: 'Unknown' },
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
