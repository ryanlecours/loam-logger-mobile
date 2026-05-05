import { forwardRef } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Transparent share overlay for a ride or aggregated ride-stats summary.
 * Captured by `react-native-view-shot` and shared via `expo-sharing` so the
 * user can drop the resulting PNG onto an Instagram story / feed post or
 * any other social app.
 *
 * Layout: Loam Logger logo on top, then a single horizontal row of four
 * icon+value stats (distance, elevation, duration, average HR). The avgHr
 * group is omitted entirely when no HR data exists — the row stays
 * centered around whatever is present rather than showing a placeholder.
 *
 * Background is transparent. Captured via `captureRef(node, { format:
 * 'png', backgroundColor: 'transparent' })` in shareRideOverlay.ts so the
 * resulting PNG carries an alpha channel and can be layered on any
 * Instagram background.
 *
 * Sized for capture, not on-screen viewing — the consumer mounts this
 * off-screen via absolute positioning so it renders at full quality
 * without being visible to the user.
 */
/**
 * Each field is independently nullable. Passing `null` (or omitting) hides
 * that stat from the row entirely — used by `ShareRideSheet` to honor the
 * user's per-field include/exclude selection. The row stays centered
 * around whatever remains. Passing all four as null still renders the
 * logo, which is intentional: users may want a logo-only branded export.
 */
export interface RideShareCardProps {
  /** Pre-formatted distance, e.g. "18.2 mi" or "29.3 km". */
  distance?: string | null;
  /** Pre-formatted elevation gain, e.g. "1,400 ft" or "427 m". */
  elevation?: string | null;
  /** Pre-formatted duration, e.g. "2h 10m". */
  duration?: string | null;
  /** Pre-formatted average heart rate, e.g. "142 bpm". */
  averageHr?: string | null;
}

export const RideShareCard = forwardRef<View, RideShareCardProps>(
  function RideShareCard({ distance, elevation, duration, averageHr }, ref) {
    return (
      <View ref={ref} collapsable={false} style={styles.container}>
        <Image
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          source={require('../../../assets/loam-logger-vertical.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <View style={styles.statsRow}>
          {distance ? <Stat icon="navigate-outline" value={distance} /> : null}
          {elevation ? <Stat icon="trending-up-outline" value={elevation} /> : null}
          {duration ? <Stat icon="time-outline" value={duration} /> : null}
          {averageHr ? <Stat icon="heart-outline" value={averageHr} /> : null}
        </View>
      </View>
    );
  },
);

function Stat({ icon, value }: { icon: keyof typeof Ionicons.glyphMap; value: string }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={32} color="#FFFFFF" />
      <Text style={styles.statValue} allowFontScaling={false}>
        {value}
      </Text>
    </View>
  );
}

// White text + icons on a transparent background — Instagram stories are
// dark-leaning by default, and the strong text shadow keeps the overlay
// readable on light photos too. If users want black-on-light variants
// later, this is the single style block to fork.
const styles = StyleSheet.create({
  container: {
    // Transparent background — captureRef preserves alpha so the PNG can
    // be layered onto any social-media background.
    backgroundColor: 'transparent',
    paddingVertical: 32,
    paddingHorizontal: 40,
    alignItems: 'center',
    // Wide enough that captureRef at result: 'tmpfile' gives a sharp
    // ~1080px PNG without manual scaling. Stories are 1080x1920; this
    // sits as a top or bottom band.
    width: 720,
  },
  logo: {
    width: 140,
    height: 140,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  stat: {
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    // Drop shadow improves readability against varied photo backgrounds
    // — without this, white-on-white photos hide the text.
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
