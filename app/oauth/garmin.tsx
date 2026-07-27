import { OAuthCallbackScreen } from '../../src/components/auth/OAuthCallbackScreen';
import { colors } from '../../src/constants/theme';
import { GARMIN_CONNECT_APP_NAME } from '../../src/constants/garminAttribution';

export default function GarminOAuthCallback() {
  // Full app name and the shared brand token — the Garmin API Brand Guidelines
  // disallow abbreviating the app name on connection surfaces, and the hardcoded
  // hex here was one of three competing Garmin blues.
  return (
    <OAuthCallbackScreen providerLabel={GARMIN_CONNECT_APP_NAME} brandColor={colors.garmin} />
  );
}
