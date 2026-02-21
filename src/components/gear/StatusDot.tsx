import { View, StyleSheet } from 'react-native';

interface StatusDotProps {
  status: string;
  size?: number;
}

const STATUS_COLORS: Record<string, string> = {
  ALL_GOOD: '#22c55e',
  DUE_SOON: '#eab308',
  DUE_NOW: '#f97316',
  OVERDUE: '#ef4444',
  UNKNOWN: '#9ca3af',
};

export function StatusDot({ status, size = 10 }: StatusDotProps) {
  const color = STATUS_COLORS[status] || STATUS_COLORS.UNKNOWN;

  return (
    <View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 1,
  },
});
