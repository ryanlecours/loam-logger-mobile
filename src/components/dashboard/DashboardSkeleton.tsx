import { View, StyleSheet } from 'react-native';
import { Skeleton, SkeletonGroup } from '../common/Skeleton';
import { colors, radius, space } from '../../constants/theme';

/**
 * Placeholder for the dashboard's first paint.
 *
 * It mirrors the screen that actually exists now: the headline, then one
 * collapsible group per bike needing work, then the recent-rides card. The
 * previous version still described a layout that had been replaced twice over
 * (a 56pt avatar row, three health tiles, component cards, an Inspect Bike
 * pill), so the app rearranged itself the moment real data arrived.
 *
 * The first group is drawn open with rows because the screen seeds the top
 * bike expanded. If that ever changes, this has to lose those rows in the same
 * commit or the jump comes straight back.
 *
 * Only the durable structure is drawn. The AI summary, the upsell and the
 * stats block are all conditional, and a skeleton that promises blocks which
 * may never render is a worse lie than a shorter one.
 */
export function DashboardSkeleton() {
  return (
    <SkeletonGroup label="Loading your dashboard" style={styles.container}>
      {/* Headline: "3 of your 5 bikes need work" */}
      <View style={styles.headlineBlock}>
        <Skeleton width="70%" height={20} />
      </View>

      {/* Top bike, open: photo header plus its component rows */}
      <View style={styles.group}>
        <BikeHeader />
        <View style={styles.rows}>
          {[0, 1].map((i) => (
            <View key={i} style={[styles.componentRow, i === 0 && styles.componentRowDivided]}>
              <Skeleton width={space.md} height={space.md} radius={radius.full} />
              <View style={styles.componentCopy}>
                <Skeleton width="45%" height={15} />
                <Skeleton width="60%" height={13} style={styles.componentSubline} />
              </View>
              <Skeleton width={84} height={13} />
            </View>
          ))}
        </View>
      </View>

      {/* Remaining bikes, collapsed to their headers */}
      {[0, 1].map((i) => (
        <View key={i} style={styles.group}>
          <BikeHeader />
        </View>
      ))}

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

/** The 48pt photo, the bike name, and the pill-plus-count meta line. */
function BikeHeader() {
  return (
    <View style={styles.header}>
      <Skeleton width={48} height={48} radius={radius.sm} />
      <View style={styles.headerCopy}>
        <Skeleton width="65%" height={15} />
        <Skeleton width="50%" height={13} style={styles.metaLine} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headlineBlock: {
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
  },
  group: {
    backgroundColor: colors.card,
    marginHorizontal: space.xl,
    marginTop: space.xl,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    paddingHorizontal: space.xl,
    paddingVertical: space.lg,
    minHeight: 72,
  },
  headerCopy: {
    flex: 1,
  },
  metaLine: {
    marginTop: space.md,
  },
  rows: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
  },
  componentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingVertical: space.lg,
    paddingHorizontal: space.xl,
    gap: space.lg,
  },
  componentRowDivided: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  componentCopy: {
    flex: 1,
  },
  componentSubline: {
    marginTop: space.xs,
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
