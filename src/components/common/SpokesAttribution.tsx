import { TouchableOpacity, Image, Text, View, StyleSheet, Linking } from 'react-native';
import { colors } from '../../constants/theme';

const SPOKES_URL = 'https://99spokes.com';

export function SpokesAttribution() {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Bike data provided by:</Text>
      <TouchableOpacity
        onPress={() => Linking.openURL(SPOKES_URL)}
        activeOpacity={0.7}
      >
        <Image
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          source={require('../../../assets/powered-by-99-spokes-for-dark-bg.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 12,
    gap: 6,
  },
  label: {
    fontSize: 13,
    color: colors.textMuted,
  },
  logo: {
    width: 115,
    height: 25,
  },
});
