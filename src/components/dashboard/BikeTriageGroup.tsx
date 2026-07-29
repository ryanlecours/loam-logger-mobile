import type { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BikeFieldsFragment, ComponentPrediction } from '../../graphql/generated';
import { ComponentRow } from '../gear/ComponentRow';
import { ComponentHealthBadge } from '../gear/ComponentHealthBadge';
import { BikeThumbnail } from '../gear/BikeThumbnail';
import { colors, radius, space, type } from '../../constants/theme';
import { selectionTick } from '../../lib/haptics';

interface BikeTriageGroupProps {
  bike: BikeFieldsFragment;
  components: ComponentPrediction[];
  /** False on the free tier, where per-component statuses are gated. */
  showStatus: boolean;
  expanded: boolean;
  onToggle: () => void;
  onComponentPress: (prediction: ComponentPrediction) => void;
  /**
   * Rendered inside the container beneath the rows when open. The advisor
   * summary rides here for the bike at the top of the list, which is what
   * makes its scope obvious: it describes the rows directly above it, so
   * nothing has to name the bike a second time.
   */
  footer?: ReactNode;
}

/** Title case, matching ComponentHealthBadge. Spoken, not drawn. */
const STATUS_LABELS: Record<string, string> = {
  OVERDUE: 'Overdue',
  DUE_NOW: 'Due now',
  DUE_SOON: 'Due soon',
  ALL_GOOD: 'All good',
};

/**
 * One bike's outstanding work, collapsed to a single identity row by default.
 *
 * A rider with five bikes was reading eleven near-identical component rows and
 * could not tell the bikes apart, so the header now leads with the same photo
 * the Gear tab uses. The photo answers "which bike"; the named pill beside it
 * answers "how bad". Those are different questions and they get different
 * marks: no health color ever lands on the image.
 *
 * Still deliberately a grouped list rather than a stack of cards. iOS expects
 * grouped/inset lists for this shape, and a card per component inside a card
 * per bike would be nested cards, which is never right. The container carries
 * the chrome; the rows carry the content. That rule is also what keeps the
 * header and the advisor footer from becoming cards in their own right: both
 * live INSIDE the one bordered container, separated by hairlines.
 *
 * The header sits a hairline above the first row rather than the 8pt DESIGN.md
 * asks for between adjacent targets. That is the iOS grouped-list idiom and
 * exactly what the component rows already do against each other, so the
 * spacing rule yields to the platform convention here.
 *
 * No expand animation: the app runs the new architecture, where
 * LayoutAnimation is a no-op, and reanimated is deliberately not a dependency.
 * The haptic tick is the confirmation that the tap registered, which is the
 * case haptics.ts documents.
 */
export function BikeTriageGroup({
  bike,
  components,
  showStatus,
  expanded,
  onToggle,
  onComponentPress,
  footer,
}: BikeTriageGroupProps) {
  const bikeName = bike.nickname || `${bike.manufacturer} ${bike.model}`;
  const count = components.length;

  // triageBikes returns components worst-first, so the head of the list is the
  // bike's worst state. On the free tier `status` is nulled at the serving
  // boundary, so there is nothing to name and the pill is omitted entirely
  // rather than guessed at.
  const worstStatus = showStatus ? (components[0]?.status ?? null) : null;

  // Free tier gets a plain count instead. It is derived from raw counters
  // (isPastInterval in useBikeTriage), not from the ramp, so it must not
  // borrow the ramp's language or color.
  const countText = showStatus
    ? `${count} ${count === 1 ? 'part needs' : 'parts need'} work`
    : `${count} ${count === 1 ? 'part' : 'parts'} past ${count === 1 ? 'its' : 'their'} interval`;

  // The pill, the chevron and the count are all visual; none of them reaches a
  // screen reader on its own, and the count is the entire reason this group is
  // collapsed. They go into one spoken label rather than three stray nodes
  // inside a button.
  const spokenLabel = [bikeName, worstStatus ? STATUS_LABELS[worstStatus] : null, countText]
    .filter(Boolean)
    .join(', ');

  return (
    <View style={styles.group}>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.header}
          onPress={() => {
            selectionTick();
            onToggle();
          }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={spokenLabel}
          accessibilityState={{ expanded }}
          accessibilityHint={expanded ? 'Hides the parts' : 'Shows the parts'}
        >
          <BikeThumbnail uri={bike.thumbnailUrl} size={48} />
          <View style={styles.headerCopy}>
            {/* Name on its own line with the meta below, rather than name and
                pill side by side: the one-line version collapses at large
                Dynamic Type sizes, and allowFontScaling={false} is banned. */}
            <Text style={styles.bikeName} numberOfLines={1}>
              {bikeName}
            </Text>
            <View style={styles.meta}>
              {worstStatus && (
                <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                  <ComponentHealthBadge status={worstStatus} size="small" />
                </View>
              )}
              <Text style={styles.count} numberOfLines={1}>
                {countText}
              </Text>
            </View>
          </View>
          <Ionicons
            name={expanded ? 'chevron-down' : 'chevron-forward'}
            size={20}
            color={colors.textMuted}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </TouchableOpacity>

        {expanded && (
          <View style={styles.rows}>
            {components.map((prediction, index) => {
              // The row renders a real Component; the prediction supplies the
              // wear numbers. Matching by id is how the action sheets already
              // bridge these two shapes.
              const component = bike.components.find((c) => c.id === prediction.componentId);
              if (!component) return null;
              return (
                <ComponentRow
                  key={prediction.componentId}
                  component={component}
                  status={showStatus ? prediction.status : null}
                  hoursRemaining={showStatus ? prediction.hoursRemaining : null}
                  hoursSinceService={prediction.hoursSinceService}
                  ridesSinceService={prediction.ridesSinceService}
                  // The footer or the container draws the last edge; a row
                  // divider there would double up against it.
                  showDivider={index < components.length - 1}
                  onPress={() => onComponentPress(prediction)}
                />
              );
            })}
            {footer}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    marginTop: space.xl,
  },
  container: {
    backgroundColor: colors.card,
    marginHorizontal: space.xl,
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
    // Comfortably past the 44pt floor: this is the primary control on the
    // screen now that the rows are hidden behind it.
    minHeight: 72,
  },
  headerCopy: {
    flex: 1,
  },
  bikeName: {
    ...type.calloutStrong,
    color: colors.textPrimary,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginTop: space.xs,
    // The pill and the count wrap rather than truncate when Dynamic Type
    // pushes them past the row width.
    flexWrap: 'wrap',
  },
  count: {
    ...type.caption,
    color: colors.textSecondary,
  },
  rows: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
  },
});
