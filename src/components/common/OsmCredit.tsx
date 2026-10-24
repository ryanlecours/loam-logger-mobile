import { Text, StyleSheet, Linking, type StyleProp, type TextStyle } from 'react-native';
import { colors } from '../../constants/theme';
import { OSM_COPYRIGHT_URL } from '../../utils/rideLift';

/**
 * ODbL credit for anything derived from the OpenStreetMap lift snapshot: a
 * lift's name, or a climb with a lift's share removed. Shown on the same
 * screen as the figure (loam-logger docs/lift-geometry-local.md).
 */
export function OsmCredit({ style }: { style?: StyleProp<TextStyle> }) {
  return (
    <Text style={[styles.text, style]}>
      Lift data{' '}
      <Text
        style={styles.link}
        onPress={() => Linking.openURL(OSM_COPYRIGHT_URL)}
        accessibilityRole="link"
      >
        © OpenStreetMap contributors
      </Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 12,
    color: colors.textMuted,
  },
  link: {
    textDecorationLine: 'underline',
  },
});
