import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { colors } from '../../constants/theme';
import {
  formatGarminSource,
  GARMIN_INSIGHT_ATTRIBUTION,
} from '../../constants/garminAttribution';

/**
 * Garmin attribution components for mobile.
 *
 * Mirrors apps/web/src/components/attribution/GarminAttribution.tsx, but
 * carries only what mobile has a surface for. Wording is copied verbatim from
 * the web original; the Garmin API Brand Guidelines distinguish acceptable
 * from unacceptable attribution by exact phrasing, so the two apps must read
 * identically.
 *
 * Two of the web exports are deliberately absent:
 *  - The per-ride badge. RideListItem, ride/[id] and ComponentRideRow build a
 *    uniform badge list across every provider and call formatGarminSource
 *    directly; routing only the Garmin badge through a component would break
 *    that loop for no gain.
 *  - The trademark notice. It belongs to downstream surfaces, and mobile has
 *    no public share page. Its one export is the history PDF, which is
 *    generated HTML rather than React and uses GARMIN_TRADEMARK_NOTICE
 *    directly (src/lib/bikeHistoryPdf.ts).
 *
 * Nothing here may render inside a tooltip, a footnote, or a collapsed
 * container, and nothing here may render where Garmin contributed nothing.
 * The guidelines forbid both. Callers do the gating.
 */

/**
 * Source line for a rendered ride map.
 *
 * STAGED, NOT YET CALLED. Mobile has no map screen at the time of writing; one
 * is due imminently, and a rendered map of device-recorded GPS is a "visual"
 * under the guidelines, which requires "Garmin [device model]" adjacent to it.
 * If the map work does not land, delete this rather than leaving it to rot.
 *
 * Attribute from the TRACK, not the ride. `rideTrack` returns `source`
 * ("strava" | "garmin") and `garminDeviceName` precisely for this: a ride
 * matched across providers carries both activity ids but only ONE persisted
 * stream, so `ride.garminActivityId` will happily credit Garmin for a
 * Strava-recorded track.
 *
 *   {track.source === 'garmin' && (
 *     <GarminSourceLine deviceName={track.garminDeviceName} />
 *   )}
 *
 * A null deviceName is fine; it falls back to plain "Garmin", which the
 * guidelines permit. Note also that RideTrackStatus.FETCHABLE is Strava-only:
 * Garmin streams arrive pushed at ingest and are never fetched on demand, so a
 * Garmin ride is either AVAILABLE or UNAVAILABLE and should not offer a
 * "load map" action.
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
 * Attribution for combined or derived data.
 *
 * The guidelines require Garmin to be named as a contributing source for any
 * output "influenced materially by Garmin device-sourced data". On mobile that
 * is component wear hours, service predictions, and the generated maintenance
 * summary, all computed from ride duration.
 *
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
