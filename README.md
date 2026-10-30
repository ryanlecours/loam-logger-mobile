# Loam Logger Mobile

React Native mobile app built with Expo Router for iOS and Android.

## Features

- **Authentication**: Email/password, Google Sign-In, Apple Sign-In
- **Expo Router**: File-based routing with tab navigation
- **Apollo Client**: GraphQL integration with bearer token auth
- **SecureStore**: Encrypted token storage
- **Onboarding Flow**: Terms acceptance, age verification, bike setup

## Getting Started

### Prerequisites

- Node.js 20+
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (macOS only) or Android Studio

### Install Dependencies

```bash
npm install
```

### Environment Variables

Create a `.env` file (one is included with development defaults):

```env
EXPO_PUBLIC_API_URL=http://localhost:4000
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-client-id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id
EXPO_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

For staging:
```env
EXPO_PUBLIC_API_URL=https://loam-api-staging.railway.app
```

### Development

```bash
# Start with Expo Go (clears cache)
npm start

# Start with dev client
npm run start:dev

# Start on iOS simulator
npm run ios

# Start on Android emulator
npm run android
```

### Running on Device

1. Install Expo Go app on your device
2. Scan the QR code from the terminal
3. Make sure your device and computer are on the same network

### GraphQL Codegen

To regenerate TypeScript types from the GraphQL schema:

```bash
npm run codegen
```

### Project Structure

```
loam-logger-mobile/
  app/
    (auth)/
      _layout.tsx      # Auth group layout
      login.tsx        # Login screen
      signup.tsx       # Sign up screen
    (onboarding)/
      _layout.tsx      # Onboarding group layout
      terms.tsx        # Terms acceptance screen
      age.tsx          # Age verification screen
      bike.tsx         # Bike setup screen
    (tabs)/
      _layout.tsx      # Tab navigation
      index.tsx        # Rides screen
      gear.tsx         # Gear screen
      settings.tsx     # Settings screen
    _layout.tsx        # Root layout with auth check
    closed-beta.tsx    # Closed beta notice
    waitlist.tsx       # Waitlist notice
  src/
    lib/
      apolloClient.ts  # Apollo Client config
      auth.ts          # Auth utilities with SecureStore
    hooks/
      useAuth.tsx      # Auth context hook
      useViewer.ts     # ME query hook
    components/
      GoogleSignInButton.tsx  # Google Sign-In component
    graphql/
      generated.ts     # Generated types and hooks
      operations/      # GraphQL operation files
  assets/             # App icons and splash screen
  app.json            # Expo configuration
  eas.json            # EAS Build configuration
  codegen.ts          # GraphQL codegen config
```

## Screen layout: safe areas

Most stacks in this app run `headerShown: false`, and Android runs
`edgeToEdgeEnabled`. Nothing above a screen reserves the status bar, the notch,
or the home indicator, so a screen whose root is a plain `<View style={{flex: 1}}>`
draws its first pixel at the display's first pixel and its title lands behind
the clock and battery.

**Every screen rendered without a native header must root itself in
`src/components/common/Screen.tsx`.**

```tsx
import { Screen } from '../../src/components/common/Screen';

return (
  <Screen>
    {/* ... */}
  </Screen>
);
```

`Screen` reads the real OS insets and applies them ON TOP OF whatever padding
the style declares, so `<Screen style={{ paddingTop: 16 }}>` keeps its 16pt of
design spacing and gains the device inset underneath. It also carries the
`flex: 1` and the obsidian background every screen needs, so the old
`container: { flex: 1, backgroundColor: colors.background }` style is redundant
once a screen adopts it. Delete it. A screen that puts a
`KeyboardAvoidingView` directly inside still needs `flex: 1` on that child so
it fills the Screen, but not the background: painting it twice is dead weight,
and leaving it under the name `container` invites someone to add chrome back
to a style that no longer owns any.

Two rules that follow from that:

- **Never hard-code a top gap** (`marginTop: 76`, `paddingTop: 60`) to clear the
  status bar. That is a guess at one device's inset: wrong on every other
  device, and silently absent the moment the first element changes. Keep only
  the design spacing you actually want between the inset and the content.
- **Pass `edges` when something else owns an edge.** `['top']` inside the tab
  navigator (the tab bar covers the bottom), and `['top']` when a
  `KeyboardAvoidingView` sits directly inside and the reserved bottom inset
  would float content above the open keyboard.

Screens that draw a native header (`app/bike/`, `app/ride/`,
`app/settings-detail/`) do not need this; the header already reserves the inset.

## Authentication Flow

1. User opens app -> Root layout checks for stored tokens
2. No tokens -> Redirect to `/(auth)/login`
3. User logs in -> Tokens stored in SecureStore
4. Terms not accepted -> Redirect to `/(onboarding)/terms`
5. Onboarding incomplete -> Redirect to `/(onboarding)/age`
6. All gates passed -> Redirect to `/(tabs)` (main app)
7. GraphQL requests use bearer token from SecureStore
8. On 401 error -> Attempt token refresh
9. Refresh fails -> Redirect to login

## Releases

Production releases are **manual** — CI does **not** build on merge to `main`.
Every production build is a paid EAS build that auto-submits to App Store Connect
(iOS) or Google Play (Android), so releases are cut on demand rather than on every
merge.

### Cut a release (recommended)

1. **Bump the marketing version** in [`app.json`](app.json) (`expo.version`) when the
   release is going to the public stores — e.g. `1.0.2` → `1.0.3` (patch) or `1.1.0`
   (features) — and commit it. Skip this when pushing another TestFlight or internal
   testing build for a release that's already in progress. You never set the iOS
   **build number** or Android **versionCode** by hand: EAS auto-increments them
   (`autoIncrement` + `appVersionSource: "remote"` in `eas.json`), so each upload gets
   a unique, increasing build number. Run the workflow once per platform.
2. Go to the repo's **Actions** tab → **EAS Build** → **Run workflow**.
3. Choose the inputs:
   - **profile**: `production` (default) or `preview`
   - **platform**: `ios` or `android`
   - **submit**: on by default. Turn it off for a production build you want to
     upload by hand (or not at all).
   - **android_track** (Android only): `internal` (default) or `production`
4. Run it. The build runs on EAS with `--no-wait`; track progress on the EAS dashboard.
   The submission is queued on EAS and starts when the build finishes.

Profile behavior in CI:

- **production, iOS** — builds and auto-submits to App Store Connect. The build then
  shows up in TestFlight; promoting it to the public App Store is a separate manual
  step in App Store Connect (submit for review / release).
- **production, Android** — builds and auto-submits to Google Play on the chosen track
  (`submit.production` and `submit.play-production` in `eas.json`):
  - `internal`: Play internal testing, released to testers as soon as Play processes
    it. Promote to production from Play Console when ready.
  - `production`: the public production track, full rollout, sent to Google for
    review as part of the submit. Use this only for a build you have already tested.
    To stage the release instead, set that profile's `releaseStatus` to `draft` and
    press Release in Play Console.
- **preview** — internal-distribution build only, no submission. Use for ad-hoc testing.

### Google Play submission key (one-time setup)

Android auto-submit uploads through the Google Play Developer API with a service
account key that EAS keeps in its credentials store. Without it the Android
production workflow run ends "failed" at the submit step while the build itself
succeeds (`eas build:view <id>` shows the truth). Keep this service account separate
from RevenueCat's.

1. In Google Cloud, create a service account (any project; key creation may need the
   org's Secure by Default policy overridden on that project, then set back to inherit).
   Create a **JSON key** for it and download it.
2. In Play Console, **Users and permissions** → **Invite new users**: enter the service
   account email, add the Loam Logger app, and grant **Release apps to testing tracks**
   and **Release to production, exclude devices, and use Play App Signing**.
3. From this repo, upload the key to EAS (interactive, done once):

   ```bash
   eas credentials -p android
   ```

   Choose the `production` profile → **Google Service Account** → **Manage your
   Google Service Account Key for Play Store Submissions** → set up a new key and
   point it at the downloaded JSON file.
4. Delete the local JSON file. Never commit it: this repo is public and `*.json` keys
   are not git-ignored by pattern.

`eas credentials -p android` (production) should then list the key under "Google
Service Account Key for Play Store Submissions". The workflow needs no GitHub
secret for this: `eas build --auto-submit-with-profile` reads the key from EAS.

### Android R8 mapping (deobfuscation file)

Android release builds run R8 (code shrinking and obfuscation) and resource
shrinking, set by `expo-build-properties` in `app.json`. Each build writes a new
`mapping.txt`, and crash stacks from that build can only be read with its own
mapping. Both destinations get it without a manual step:

- **Google Play**: the Android Gradle Plugin puts the mapping inside the AAB, at
  `BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map`, and Play
  reads it from there when `eas submit` uploads the bundle. The bundle's
  **Downloads** tab in Play Console (App bundle explorer) should list a
  deobfuscation file. The metadata is not delivered to devices, so the AAB on
  disk looks bigger than what users download.
- **Sentry**: the Sentry Android Gradle Plugin (`experimental_android` in the
  `@sentry/react-native/expo` plugin options) stamps a ProGuard UUID into the
  app and uploads the mapping during the EAS build, using the same
  `SENTRY_AUTH_TOKEN` as the JS source maps. Native (NDK) symbol upload is left
  off.

If a build ever lacks the mapping in Play (for example a build made outside EAS),
upload it by hand: Play Console → **Test and release** → **App bundle explorer** →
pick the version → **Downloads** → **Deobfuscation file** → upload
`android/app/build/outputs/mapping/release/mapping.txt` from that same build.

A new crash from a class R8 renamed or removed shows up as
`ClassNotFoundException`, `NoSuchMethodError` or `NoSuchFieldError` in a release
build only. The fix is a keep rule in `extraProguardRules` (same plugin entry in
`app.json`); most libraries ship their own rules, so add one only for the
library that broke.

### Local / ad-hoc builds

You can also build from your machine with the EAS CLI:

```bash
# Development build (internal distribution)
eas build --profile development

# Preview build (internal distribution)
eas build --profile preview

# Production build
eas build --profile production
```

A local Android release build (`npx expo run:android --variant release`, or
`./gradlew bundleRelease` in `android/`) has no Sentry token, so set
`SENTRY_DISABLE_AUTO_UPLOAD=true` first; the source map and mapping uploads are
then skipped instead of failing the build.

## Error Tracking

[Sentry](https://sentry.io) is integrated for crash reporting and error tracking. It is disabled in development (`__DEV__`).

- **Expo plugin**: `@sentry/react-native/expo` in `app.json`
- **Initialization**: `app/_layout.tsx` (module-level `Sentry.init()` + `Sentry.wrap()`)
- **User context**: Set automatically after authentication
- **Source maps**: Uploaded during EAS builds via `SENTRY_AUTH_TOKEN`
- **Android R8 mapping**: Uploaded during EAS builds by the Sentry Android Gradle
  Plugin, so Java and Kotlin frames in Android crashes read with real names (see
  "Android R8 mapping" under Releases)

### Required secrets for builds

| Secret | Where | Purpose |
|--------|-------|---------|
| `EXPO_TOKEN` | GitHub Actions + EAS | EAS CLI authentication |
| `SENTRY_AUTH_TOKEN` | GitHub Actions + EAS | Source map and Android R8 mapping uploads to Sentry |

## Notes

- The API URL in `.env` should point to your staging or local backend
- For production builds, update the API URL to your production backend
- Google Sign-In requires native configuration (see Expo docs)
- Apple Sign-In only works on real iOS devices (not simulator)
