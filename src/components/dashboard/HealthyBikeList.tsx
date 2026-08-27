import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { BikeFieldsFragment } from '../../graphql/generated';
import { BikeThumbnail } from '../gear/BikeThumbnail';
import { colors, radius, space, type } from '../../constants/theme';

interface HealthyBikeListProps {
  /** Bikes with components tracked and nothing flagged. Never empty. */
  bikes: BikeFieldsFragment[];
}

/**
 * The rider's bikes, when none of them need work.
 *
 * This screen is an exception list, and that is still right when something is
 * wrong: a rider with five bikes and one overdue fork wants the fork, not a
 * roll call. But when NOTHING is flagged the exception list has nothing to
 * show, and the screen used to answer with a headline and empty space. A rider
 * who had just finished onboarding saw no trace of the bike they had spent the
 * whole flow building, which reads as "it didn't save" rather than "it's fine".
 *
 * So the all-clear case gets identity instead of silence: the same photo the
 * Gear tab and the triage groups use, the bike's name, and the number of parts
 * under watch. No health language and no ramp color anywhere in here. The
 * headline above already made the health claim, and repeating it per row would
 * also put ramp words on the free tier, where per-component status is gated at
 * the serving boundary and there is nothing to claim.
 *
 * One bordered container with hairline-separated rows, not a card per bike,
 * matching the grouped-list idiom BikeTriageGroup documents.
 */
export function HealthyBikeList({ bikes }: HealthyBikeListProps) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {bikes.map((bike, index) => {
        const name = bike.nickname || `${bike.manufacturer} ${bike.model}`;
        const count = bike.predictions?.components?.length ?? 0;
        const countText = `${count} ${count === 1 ? 'part' : 'parts'} tracked`;

        return (
          <TouchableOpacity
            key={bike.id}
            style={[styles.row, index > 0 && styles.rowDivided]}
            onPress={() => router.push(`/bike/${bike.id}` as Href)}
            activeOpacity={0.7}
            accessibilityRole="button"
            // The photo, the count and the chevron are all visual. One spoken
            // label beats three stray nodes inside a button.
            accessibilityLabel={`${name}, ${countText}`}
            accessibilityHint="Opens this bike"
          >
            <BikeThumbnail uri={bike.thumbnailUrl} size={48} />
            <View style={styles.copy}>
              <Text style={styles.name} numberOfLines={1}>
                {name}
              </Text>
              <Text style={styles.count} numberOfLines={1}>
                {countText}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textMuted}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: space.xl,
    marginHorizontal: space.xl,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    paddingHorizontal: space.xl,
    paddingVertical: space.lg,
    minHeight: 72,
  },
  rowDivided: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
  },
  copy: {
    flex: 1,
  },
  name: {
    ...type.calloutStrong,
    color: colors.textPrimary,
  },
  count: {
    ...type.footnote,
    color: colors.textMuted,
    marginTop: space.hair,
  },
});
