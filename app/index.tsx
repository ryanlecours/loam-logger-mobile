import { ImageBackground, View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../src/constants/theme';

/**
 * Explicit root route. Without this file, Expo Router would pick the
 * alphabetically-first screen in the route tree as the cold-boot landing —
 * which is non-deterministic (it can also collide with OS-restored
 * navigation state) and can surface gated screens like /(onboarding)/terms
 * before the auth gate in _layout.tsx has had a chance to decide where the
 * user should actually go.
 *
 * This route shows a branded full-screen splash (logo background + spinner
 * overlay); all navigation is driven by the gate in app/_layout.tsx, which
 * redirects based on auth + onboarding state as soon as useAuth resolves.
 */
export default function IndexScreen() {
  return (
    <ImageBackground
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      source={require('../assets/loam-logger-vertical.png')}
      style={styles.container}
      // "cover" scales the image to fill the screen while preserving aspect
      // ratio, cropping overflow. Right choice for a background that's
      // designed to fill the screen on any resolution.
      resizeMode="cover"
    >
      <View style={styles.spinnerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: colors.background,
  },
  spinnerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 80,
  },
});
