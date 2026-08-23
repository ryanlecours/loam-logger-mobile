import { forwardRef } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Share overlay for a ride or aggregated ride-stats summary. Captured by
 * `react-native-view-shot` and shared via `expo-sharing` so the user can drop
 * the resulting PNG onto an Instagram story / feed post or any other social
 * app.
 *
 * Layout: Loam Logger logo on top, then a single horizontal row of four
 * icon+value stats (distance, elevation, duration, average HR). The avgHr
 * group is omitted entirely when no HR data exists — the row stays
 * centered around whatever is present rather than showing a placeholder.
 *
 * ## Why the panel is translucent rather than absent
 *
 * This used to be white text on a fully transparent background, leaning on a
 * text shadow to survive whatever it landed on. It did not: a story photo with
 * a bright sky or a snow field is the same value as the text, and a shadow
 * only outlines letterforms, it does not put anything behind them.
 *
 * So the content sits on a forest-tinted obsidian panel at 65% alpha with a
 * mint edge-light, which is what DESIGN.md's frosted-glass surfaces are
 * everywhere else in the product. 65% is chosen, not picked. Composited over
 * the worst case a story can offer (pure white) the panel lands on #5F625F,
 * where cream scores 5.8:1; over a bright sky it is 7.1:1 and over a dark
 * photo 17:1. The same cream directly on that white photo, which is what
 * shipped before, is 1.06:1, which is not "hard to read", it is invisible.
 * Going more transparent buys atmosphere back at the cost of the exact
 * failure this exists to fix.
 *
 * The PNG still carries a real alpha channel: the panel is translucent and the
 * corners outside its radius are fully clear, so it layers rather than sitting
 * in an opaque rectangle. Note that the text itself composites to fully opaque
 * in the capture, so the readability question is entirely about the field
 * behind the letters.
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
  /** Human-readable label for the period these stats cover (e.g. "Year to date",
   *  "Last 30 days", "2024"). Rendered above the stats row when present.
   *  Omitted for single-ride shares where a timeframe isn't applicable. */
  title?: string | null;
  /** Pre-formatted distance, e.g. "18.2 mi" or "29.3 km". */
  distance?: string | null;
  /** Pre-formatted elevation gain, e.g. "1,400 ft" or "427 m". */
  elevation?: string | null;
  /** Pre-formatted duration, e.g. "2h 10m". */
  duration?: string | null;
  /** Pre-formatted average heart rate, e.g. "142 bpm". */
  averageHr?: string | null;
}

/**
 * `allowFontScaling={false}` below is a deliberate exception to this app's rule
 * that text scales with Dynamic Type.
 *
 * This node is never read on screen: it is rendered off-screen and captured by
 * `captureRef` into a fixed-size image the rider shares. Letting it scale would
 * mean the exported graphic changed dimensions per person and overflowed the
 * capture canvas, so the image would clip for exactly the readers who need
 * larger type. The on-screen share sheet around it scales normally.
 */
export const RideShareCard = forwardRef<View, RideShareCardProps>(
  function RideShareCard({ title, distance, elevation, duration, averageHr }, ref) {
    return (
      <View ref={ref} collapsable={false} style={styles.container}>
        {title ? (
          <Text style={styles.title} allowFontScaling={false}>
            {title}
          </Text>
        ) : null}
        <View style={styles.statsRow}>
          <Image
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            source={require('../../../assets/loam_logger_192_rounded.png')}
            style={styles.logo}
            resizeMode="contain"
          />
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
      <Ionicons name={icon} size={32} color={INK} />
      <Text style={styles.statValue} allowFontScaling={false}>
        {value}
      </Text>
    </View>
  );
}

// DESIGN.md palette literals, inlined rather than imported from the theme.
// This node is not app UI: it renders off-screen into a file that outlives the
// session and gets read on someone else's phone, so it must not follow app
// theming, Dynamic Type, or anything else that varies per device. Naming them
// here keeps the brand values in one place without pretending they are tokens.
const INK = '#FAF8F4'; // cream. DESIGN.md: never pure white.
const PANEL = 'rgba(9, 14, 11, 0.65)'; // forest-tinted obsidian, matching the app's scrim hue
const EDGE = 'rgba(156, 176, 164, 0.28)'; // mint, per the Edge-Light Rule
const SHADOW = 'rgba(9, 14, 11, 0.45)'; // DESIGN.md: shadows are forest-tinted, never neutral black

const styles = StyleSheet.create({
  container: {
    // Translucent panel rather than a bare transparent box: see the header.
    // captureRef preserves alpha, so this layers onto a story instead of
    // punching an opaque rectangle into it.
    backgroundColor: PANEL,
    // Full pill is for controls; a major panel is the roundest a surface gets.
    // 32 rather than DESIGN.md's 24 because this renders at roughly 2x phone
    // scale, and a radius that is not scaled with it reads as a sharper corner
    // than the same panel on screen.
    borderRadius: 32,
    // 2px, not 1: the hairline edge-light is specified at on-screen scale and
    // would land as a sub-pixel shimmer in the export.
    borderWidth: 2,
    borderColor: EDGE,
    paddingVertical: 32,
    paddingHorizontal: 40,
    alignItems: 'center',
    // Wide enough that captureRef at result: 'tmpfile' gives a sharp
    // ~1080px PNG without manual scaling. Stories are 1080x1920; this
    // sits as a top or bottom band.
    width: 720,
  },
  logo: {
    width: 64,
    height: 64,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: INK,
    textAlign: 'center',
    marginBottom: 16,
    // Same shadow as statValue: now that the panel carries readability, this
    // is edge definition rather than the whole defence, so it is lighter than
    // the near-opaque black halo it replaces.
    textShadowColor: SHADOW,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
    color: INK,
    // Softens the letterform edges against whatever shows through the panel.
    // The panel is what makes these readable; this only sharpens them.
    textShadowColor: SHADOW,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
