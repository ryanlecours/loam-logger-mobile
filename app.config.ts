import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * app.json holds the app's static config; this adds the one value that can't
 * be committed: the Google Maps key Android needs to draw any map.
 *
 * react-native-maps draws with the Google Maps SDK on Android, and the SDK
 * throws "API key not found" the moment a map mounts without one, which takes
 * the whole screen down. iOS uses Apple Maps and needs no key.
 *
 * The key comes from GOOGLE_MAPS_ANDROID_API_KEY: the EAS environment for
 * cloud builds, `.env` for local ones. It is restricted in Google Cloud to
 * this package and its signing certificates, but this repo is public, so it
 * stays out of git. Without it the build still works: `androidMapsEnabled`
 * tells the map components to show a placeholder instead of mounting a map.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY?.trim() || undefined;

  return {
    ...config,
    android: {
      ...config.android,
      ...(googleMapsApiKey && {
        config: { ...config.android?.config, googleMaps: { apiKey: googleMapsApiKey } },
      }),
    },
    extra: {
      ...config.extra,
      androidMapsEnabled: Boolean(googleMapsApiKey),
    },
  } as ExpoConfig;
};
