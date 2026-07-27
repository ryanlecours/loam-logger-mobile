import { Image, type StyleProp, type ImageStyle } from 'react-native';

/**
 * The official Garmin Connect app tile — mirror of
 * apps/web/src/components/attribution/GarminConnectMark.tsx.
 *
 * The Garmin API Brand Guidelines, under AUTHENTICATING APPLICATIONS: "use the
 * full app name and tile to display the connection. Do not abbreviate, truncate
 * or stylize the Garmin app name." Mobile previously rendered an Ionicons
 * `watch-outline` glyph in place of the Garmin mark, which is the kind of
 * substitution a brand review treats as misrepresenting the partner.
 *
 * The artwork is never recolored, cropped, rotated or animated, is never used
 * as an avatar or decoration, and never appears where the Garmin connection is
 * not the subject. It is not a data-source attribution — use
 * formatGarminSource() for that.
 *
 * Asset: assets/garmin-connect-app-tile.png, supplied by Garmin. Do not
 * substitute a redrawn or re-exported version.
 */
export function GarminConnectMark({
  size = 24,
  style,
}: {
  size?: number;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      // Metro resolves static image assets through require(); an ES import
      // would not be bundled. Same treatment as the other bundled images.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      source={require('../../../assets/garmin-connect-app-tile.png')}
      style={[{ width: size, height: size, borderRadius: size * 0.22 }, style]}
      resizeMode="contain"
      // Decorative: the adjacent label already names Garmin Connect.
      accessibilityRole="image"
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
