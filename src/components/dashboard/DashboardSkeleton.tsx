import { View, StyleSheet } from 'react-native';
import { Skeleton, SkeletonGroup } from '../common/Skeleton';
import { colors, radius, space } from '../../constants/theme';

/**
 * Placeholder for the dashboard's first paint.
 *
 * It mirrors the screen that actually exists now: identity row with a 56pt
 * avatar, the three-tile health row, the component cards behind those counts,
 * the Inspect Bike action, and the recent-rides card. The previous version
 * still described a layout that had been replaced (a greeting line, a
 * three-across stat row, a single card), so the app rearranged itself the
 * moment real data arrived.
 *
 * Only the durable structure is drawn. The AI summary, the upsell and the
 * stats block are all conditional, and a skeleton that promises blocks which
 * may never render is a worse lie than a shorter one.
 */
export function DashboardSkeleton() {
  return (
    <SkeletonGroup label="Loading your dashboard" style={styles.container}>
      {/* Identity row: avatar, bike name, subtitle */}
      <View style={styles.headerSection}>
        <View style={styles.identityRow}>
          <Skeleton width={56} height={56} radius={radius.md} />
          <View style={styles.identityCopy}>
            <Skeleton width="70%" height={22} />
            <Skeleton width="45%" height={13} style={styles.subtitleLine} />
          </View>
        </View>
      </View>

      {/* Health row: three tiles */}
      <View style={styles.healthRow}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.healthTile}>
            <Skeleton width={28} height={24} />
            <Skeleton width="80%" height={11} style={styles.tileLabel} />
          </View>
        ))}
      </View>

      {/* Two component cards behind those counts */}
      <View style={styles.section}>
        {[0, 1].map((i) => (
          <View key={i} style={styles.card}>
            <Skeleton width="55%" height={16} />
            <Skeleton width="100%" height={6} style={styles.bar} />
            <View style={styles.cardFooter}>
              <Skeleton width={110} height={13} />
              <Skeleton width={78} height={20} />
            </View>
          </View>
        ))}
      </View>

      {/* Inspect Bike */}
      <Skeleton height={50} radius={radius.full} style={styles.action} />

      {/* Recent rides: eyebrow plus three rows */}
      <View style={styles.ridesHeader}>
        <Skeleton width={110} height={12} />
      </View>
      <View style={styles.ridesCard}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.rideRow, i === 2 && styles.rideRowLast]}>
            <Skeleton width={36} height={36} />
            <View style={styles.rideCopy}>
              <Skeleton width="60%" height={14} />
              <Skeleton width="40%" height={12} style={styles.rideSubline} />
            </View>
          </View>
        ))}
      </View>
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSection: {
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
    paddingBottom: space.lg,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    minHeight: 56,
  },
  identityCopy: {
    flex: 1,
  },
  subtitleLine: {
    marginTop: space.md,
  },
  healthRow: {
    flexDirection: 'row',
    paddingHorizontal: space.xl,
    gap: 10,
  },
  healthTile: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 14,
    paddingHorizontal: space.lg,
    gap: space.hair,
  },
  tileLabel: {
    marginTop: space.xs,
  },
  section: {
    paddingHorizontal: space.xl,
    marginTop: space.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: space.xl,
    marginBottom: space.lg,
    gap: space.lg,
  },
  bar: {
    marginTop: space.xs,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  action: {
    marginHorizontal: space.xl,
    marginTop: space.xl,
  },
  ridesHeader: {
    paddingHorizontal: space.xl,
    marginTop: space.section,
    marginBottom: space.md,
  },
  ridesCard: {
    backgroundColor: colors.card,
    marginHorizontal: space.xl,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  rideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space.xl,
    gap: space.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  rideRowLast: {
    borderBottomWidth: 0,
  },
  rideCopy: {
    flex: 1,
  },
  rideSubline: {
    marginTop: space.md,
  },
});
