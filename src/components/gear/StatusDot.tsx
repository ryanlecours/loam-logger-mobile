import { View, StyleSheet } from 'react-native';
import { colors, healthTone, radius } from '../../constants/theme';

interface StatusDotProps {
  /** Null/undefined (e.g. free-tier gated predictions) renders nothing. */
  status?: string | null;
  size?: number;
}

export function StatusDot({ status, size = 10 }: StatusDotProps) {
  // No status (free tier hides predictions) — render nothing rather than
  // implying a known state with a gray dot.
  if (!status) return null;

  const tone = healthTone(status);

  return (
    <View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          backgroundColor: tone.base,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    // Stays circular at any `size` without arithmetic, and without producing a
    // sub-8 radius value that only reads as legal because a circle is exempt.
    borderRadius: radius.full,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 2,
    elevation: 1,
  },
});
