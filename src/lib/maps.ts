import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Whether a native map can be drawn in this build.
 *
 * Android's Google Maps SDK throws when a map mounts without an API key, and
 * the throw takes the whole screen down (a ride recording included). The key
 * is injected at build time by app.config.ts, which also records whether it
 * did in `extra.androidMapsEnabled`. iOS uses Apple Maps and needs no key.
 */
export function canDrawNativeMap(
  os: string = Platform.OS,
  extra: Record<string, unknown> | undefined = Constants.expoConfig?.extra
): boolean {
  if (os !== 'android') return true;
  return extra?.androidMapsEnabled === true;
}

/**
 * Placeholder copy for a build that can't draw a map. Development builds also
 * name the missing setting, since that's the only reason it happens.
 */
export function mapUnavailableText(base: string, isDev: boolean = __DEV__): string {
  return isDev ? `${base}\nGOOGLE_MAPS_ANDROID_API_KEY is not set` : base;
}
