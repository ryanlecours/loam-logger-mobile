import { View, StyleSheet } from 'react-native';
import { colors } from '../../constants/theme';

export function DashboardSkeleton() {
  return (
    <View style={styles.container}>
      {/* Header skeleton */}
      <View style={styles.greetingContainer}>
        <View style={[styles.skeleton, styles.greetingLine]} />
        <View style={[styles.skeleton, styles.subtitleLine]} />
      </View>

      {/* Stat cards skeleton */}
      <View style={styles.statsRow}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.statCard}>
            <View style={[styles.skeleton, { width: 20, height: 20, borderRadius: 10 }]} />
            <View style={[styles.skeleton, { width: 50, height: 24, marginTop: 8 }]} />
            <View style={[styles.skeleton, { width: 30, height: 12, marginTop: 4 }]} />
          </View>
        ))}
      </View>

      {/* Button skeleton */}
      <View style={[styles.skeleton, styles.buttonSkeleton]} />

      {/* Section skeleton */}
      <View style={styles.sectionSkeleton}>
        <View style={[styles.skeleton, { width: 120, height: 14 }]} />
        <View style={styles.cardSkeleton}>
          <View style={[styles.skeleton, { width: '60%', height: 16 }]} />
          <View style={[styles.skeleton, { width: '100%', height: 6, marginTop: 12 }]} />
          <View style={[styles.skeleton, { width: '40%', height: 14, marginTop: 10 }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 24,
  },
  greetingContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
    alignItems: 'center',
  },
  skeleton: {
    backgroundColor: colors.skeleton,
    borderRadius: 6,
  },
  greetingLine: {
    width: '60%',
    height: 28,
  },
  subtitleLine: {
    width: '40%',
    height: 16,
    marginTop: 8,
  },
  buttonSkeleton: {
    height: 48,
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
  },
  sectionSkeleton: {
    paddingHorizontal: 16,
  },
  cardSkeleton: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 16,
    marginTop: 12,
  },
});
