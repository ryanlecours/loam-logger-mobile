import { TouchableOpacity, Text, StyleSheet, Linking } from 'react-native';
import { colors } from '../../constants/theme';

const SPOKES_URL = 'https://99spokes.com';

export function SpokesAttribution() {
  return (
    <TouchableOpacity
      onPress={() => Linking.openURL(SPOKES_URL)}
      style={styles.container}
      activeOpacity={0.7}
    >
      <Text style={styles.text}>
        Powered by <Text style={styles.link}>99 Spokes</Text>
      </Text>
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  text: {
    fontSize: 13,
    color: colors.textMuted,
  },
  link: {
    color: colors.primary,
    fontWeight: '600',
  },
});
