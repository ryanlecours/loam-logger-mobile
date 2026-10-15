import { Platform } from 'react-native';
import * as Application from 'expo-application';

/**
 * Identifies this app to the API (`x-loam-client: ios/1.4.0`) so server-side
 * analytics can split events by platform and app version. The API also infers
 * "mobile" from bearer auth when the header is missing; this adds the OS and
 * version on top. Parsed strictly server-side (apps/api/src/lib/clientPlatform.ts),
 * so only send the shapes it accepts.
 */
export const CLIENT_HEADER = 'x-loam-client';

export function clientHeaderValue(
  os: string = Platform.OS,
  version: string | null = Application.nativeApplicationVersion,
): string | null {
  if (os !== 'ios' && os !== 'android') return null;
  return version && /^\d+\.\d+\.\d+$/.test(version) ? `${os}/${version}` : os;
}
