import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { colors } from '../../constants/theme';
import { GARMIN_INSIGHT_ATTRIBUTION } from '../../constants/garminAttribution';

/**
 * Garmin attribution for combined or derived data.
 *
 * The Garmin API Brand Guidelines require Garmin to be named as a contributing
 * source for any output "influenced materially by Garmin device-sourced data".
 * On mobile that means component wear hours, service predictions, and the
 * generated maintenance summary, all of which are computed from ride duration.
 *
 * Deliberately narrower than the web counterpart
 * (apps/web/src/components/attribution/GarminAttribution.tsx), which also
 * exports badge, inline-source and trademark components. Mobile does not need
 * them and shipping unused exports invites them to drift from the web copy:
 *  - Per-ride attribution is rendered inline by RideListItem, ride/[id] and
 *    ComponentRideRow, which build a uniform badge list across all providers.
 *    Routing only the Garmin badge through a separate component would break
 *    that loop for no gain; those screens call formatGarminSource directly.
 *  - There is no ride map on mobile, so nothing needs a source line.
 *  - The trademark notice belongs to downstream surfaces. Mobile has no public
 *    share page; its one export is the history PDF, which is generated HTML
 *    rather than React and uses GARMIN_TRADEMARK_NOTICE directly
 *    (src/lib/bikeHistoryPdf.ts).
 *
 * Never render this inside a tooltip, a footnote, or a collapsed container, and
 * never render it where Garmin contributed nothing: the guidelines forbid both.
 * Callers gate on the bike's contributingSources.
 */
export function GarminDerivedNote({ style }: { style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.note, style]}>{GARMIN_INSIGHT_ATTRIBUTION}</Text>;
}

const styles = StyleSheet.create({
  note: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
  },
});
