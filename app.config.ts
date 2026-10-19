import * as fs from 'fs';
import * as path from 'path';
import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * app.json holds the app's static config; this adds the two Android values
 * that can't be committed, because this repo is public.
 *
 * Google Maps key. react-native-maps draws with the Google Maps SDK on
 * Android, and the SDK throws "API key not found" the moment a map mounts
 * without one, which takes the whole screen down. iOS uses Apple Maps and
 * needs no key. It comes from GOOGLE_MAPS_ANDROID_API_KEY: the EAS environment
 * for cloud builds, `.env` for local ones. It is restricted in Google Cloud to
 * this package and its signing certificates. Without it a local or preview
 * build still works: `androidMapsEnabled` tells the map components to show a
 * placeholder instead of mounting a map.
 *
 * Firebase config (google-services.json). Android push goes through Firebase
 * Cloud Messaging, and expo-notifications cannot get a push token without it.
 * On EAS it comes from the GOOGLE_SERVICES_JSON file variable, which holds the
 * file's path on the build machine; locally, put the file at the project root,
 * where it is git-ignored. Without it the app still builds and runs, but
 * Android gets no push token. iOS uses APNs and needs neither.
 *
 * A production Android build on EAS missing either one fails here instead, so
 * a release can't quietly ship without maps or push.
 */
const LOCAL_GOOGLE_SERVICES_FILE = './google-services.json';

export default ({ config }: ConfigContext): ExpoConfig => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY?.trim() || undefined;
  const googleServicesFile =
    process.env.GOOGLE_SERVICES_JSON?.trim() ||
    (fs.existsSync(path.join(__dirname, LOCAL_GOOGLE_SERVICES_FILE)) ? LOCAL_GOOGLE_SERVICES_FILE : undefined);

  const productionAndroid =
    process.env.EAS_BUILD === 'true' &&
    process.env.EAS_BUILD_PLATFORM === 'android' &&
    process.env.EAS_BUILD_PROFILE === 'production';

  if (productionAndroid && !googleMapsApiKey) {
    throw new Error(
      'GOOGLE_MAPS_ANDROID_API_KEY is not set for this production Android build, so it would ship without maps. ' +
        'Add it with: eas env:create --name GOOGLE_MAPS_ANDROID_API_KEY --environment production --visibility sensitive'
    );
  }
  if (productionAndroid && !googleServicesFile) {
    throw new Error(
      'GOOGLE_SERVICES_JSON is not set for this production Android build, so it would ship without push notifications. ' +
        'Add it with: eas env:create --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --environment production --visibility secret'
    );
  }

  return {
    ...config,
    android: {
      ...config.android,
      ...(googleMapsApiKey && {
        config: { ...config.android?.config, googleMaps: { apiKey: googleMapsApiKey } },
      }),
      ...(googleServicesFile && { googleServicesFile }),
    },
    extra: {
      ...config.extra,
      androidMapsEnabled: Boolean(googleMapsApiKey),
    },
  } as ExpoConfig;
};
