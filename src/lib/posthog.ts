import PostHog, { type PostHogAutocaptureOptions } from 'posthog-react-native';

/**
 * Product analytics (PostHog). Same project as the web app and the API, keyed
 * on the Loam user id, so a rider's app, web and server events land on one
 * timeline. Identity and the account-level opt-out are applied by
 * usePostHogUser; screens are tracked by usePostHogScreens.
 *
 * Disabled in development and whenever EXPO_PUBLIC_POSTHOG_KEY is unset
 * (preview and dev builds), so only production builds send anything.
 *
 * Session replay stays off: the privacy policy (Section 6) limits recordings
 * to the web app.
 */
const apiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;

export const posthogEnabled = Boolean(apiKey) && !__DEV__;

export const posthog = new PostHog(apiKey || 'phc_disabled', {
  host: process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
  disabled: !posthogEnabled,
  captureAppLifecycleEvents: true,
  enableSessionReplay: false,
});

export const posthogAutocapture: PostHogAutocaptureOptions = {
  // expo-router hides the NavigationContainer, so screens are captured
  // manually from the route segments (usePostHogScreens).
  captureScreens: false,
  captureTouches: true,
  // The SDK's default list includes `children`, which records the text inside
  // whatever was tapped: a bike name, an email on the profile card. Capture
  // only labels a developer wrote, matching the web app's decision to drop
  // `$el_text`. `style` is noise for analysis, so it goes too.
  propsToCapture: ['testID', 'accessibilityLabel', 'ph-label'],
};

/**
 * Screen name for a set of expo-router segments: route patterns, not URLs,
 * so `/bike/[id]` groups every bike instead of one row per bike id. Route
 * groups like `(tabs)` are layout plumbing, not screens, so they drop out.
 */
export function screenNameFromSegments(segments: string[]): string {
  const visible = segments.filter((s) => !(s.startsWith('(') && s.endsWith(')')));
  return `/${visible.join('/')}`;
}
