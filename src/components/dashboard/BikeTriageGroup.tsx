import { View, Text, StyleSheet } from 'react-native';
import type { BikeFieldsFragment, ComponentPrediction } from '../../graphql/generated';
import { ComponentRow } from '../gear/ComponentRow';
import { colors, radius, space, type } from '../../constants/theme';

interface BikeTriageGroupProps {
  bike: BikeFieldsFragment;
  components: ComponentPrediction[];
  /** False on the free tier, where per-component statuses are gated. */
  showStatus: boolean;
  /** Omitted when the rider has one bike: there is nothing to disambiguate. */
  showBikeName: boolean;
  onComponentPress: (prediction: ComponentPrediction) => void;
}

/**
 * One bike's outstanding work: a section header naming the bike, then its
 * components as rows in a single inset container.
 *
 * Deliberately a grouped list rather than a stack of cards. iOS expects
 * grouped/inset lists for this shape, and a card per component inside a card
 * per bike would be nested cards, which is never right. The container carries
 * the chrome; the rows carry the content.
 */
export function BikeTriageGroup({
  bike,
  components,
  showStatus,
  showBikeName,
  onComponentPress,
}: BikeTriageGroupProps) {
  const bikeName = bike.nickname || `${bike.manufacturer} ${bike.model}`;

  return (
    <View style={styles.group}>
      {showBikeName && (
        <Text style={styles.bikeName} numberOfLines={1} accessibilityRole="header">
          {bikeName}
        </Text>
      )}
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
              // The container draws the last edge; a row divider there would
              // double up against the card border.
              showDivider={index < components.length - 1}
              onPress={() => onComponentPress(prediction)}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    marginTop: space.xl,
  },
  bikeName: {
    ...type.calloutStrong,
    color: colors.textPrimary,
    marginHorizontal: space.xl,
    marginBottom: space.md,
  },
  rows: {
    backgroundColor: colors.card,
    marginHorizontal: space.xl,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
});
