import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { colors } from '../../constants/theme';
import {
  formatGarminSource,
  GARMIN_CHART_ATTRIBUTION,
  GARMIN_INSIGHT_ATTRIBUTION,
  GARMIN_TRADEMARK_NOTICE,
} from '../../constants/garminAttribution';

/**
 * Garmin attribution, in the three shapes the Garmin API Brand Guidelines call
 * for. Mirrors apps/web/src/components/attribution/GarminAttribution.tsx —
 * keep the two in step; Garmin reviews the whole product.
 *
 * As on web, this never renders inside a tooltip, footnote or collapsed
 * container ("Never bury the Garmin attribution..."), and it never decides on
 * its own whether Garmin data is present — callers gate on hasGarminData().
 */

/**
 * Primary displays: ride rows, activity feeds, overview cards.
 * Renders "Garmin Edge 840" beside the entry's title.
 */
export function GarminSourceBadge({
  deviceName,
  style,
}: {
  deviceName?: string | null;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.badgeText}>{formatGarminSource(deviceName)}</Text>
    </View>
  );
}

/**
 * Secondary screens: ride detail, expanded views, reports.
 */
export function GarminSourceLine({
  deviceName,
  style,
}: {
  deviceName?: string | null;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text style={[styles.note, style]}>Data source: {formatGarminSource(deviceName)}</Text>
  );
}

/**
 * Combined or derived data: component wear, service predictions, bike health,
 * and the generated maintenance summary. Uses Loam's muted text color rather
 * than Garmin blue — this is Loam explaining a data lineage, not a Garmin badge.
 */
export function GarminDerivedNote({
  variant = 'insight',
  style,
}: {
  variant?: 'insight' | 'chart';
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text style={[styles.note, style]}>
      {variant === 'chart' ? GARMIN_CHART_ATTRIBUTION : GARMIN_INSIGHT_ATTRIBUTION}
    </Text>
  );
}

/** Trademark notice for downstream / shared surfaces. */
export function GarminTrademarkNotice({ style }: { style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.note, style]}>{GARMIN_TRADEMARK_NOTICE}</Text>;
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 125, 195, 0.18)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    // Deliberately not uppercased: the badge carries a Garmin product name.
    color: colors.garminOnDark,
  },
  note: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
  },
});
