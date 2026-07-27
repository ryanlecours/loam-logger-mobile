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
 *  - There is no ride map on mobile yet, so nothing needs a source line.
 *
 *    WHEN A RIDE MAP LANDS, it needs one: a rendered map of device-recorded
 *    GPS is a "visual" under the guidelines and must carry
 *    "Garmin [device model]" adjacent to it. Copy GarminSourceLine back from
 *    the web file rather than writing a new one, so the wording matches.
 *
 *    Attribute from the TRACK, not from the ride. `rideTrack` returns `source`
 *    ("strava" | "garmin") and `garminDeviceName` precisely for this: a ride
 *    matched across providers carries both activity ids but only ONE persisted
 *    stream, so `ride.garminActivityId` will happily credit Garmin for a
 *    Strava-recorded track. Gate on `track.source === 'garmin'` and pass
 *    `track.garminDeviceName` (null is fine, it falls back to plain "Garmin").
 *
 *    Note also that RideTrackStatus.FETCHABLE is Strava-only. Garmin streams
 *    arrive pushed at ingest and are never fetched on demand, so a Garmin ride
 *    is either AVAILABLE or UNAVAILABLE and should not offer a "load map"
 *    action.
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
