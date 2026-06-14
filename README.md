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
Every production build is a paid EAS build that auto-submits to App Store Connect,
so releases are cut on demand rather than on every merge.

### Cut a release (recommended)

1. **Bump the marketing version** in [`app.json`](app.json) (`expo.version`) when the
   release is going to the public App Store — e.g. `1.0.2` → `1.0.3` (patch) or `1.1.0`
   (features) — and commit it. Skip this when pushing another TestFlight build for a
   release that's already in progress. You never set the iOS **build number** by hand:
   EAS auto-increments it (`autoIncrement` + `appVersionSource: "remote"` in `eas.json`),
   so each upload gets a unique, increasing build number.
2. Go to the repo's **Actions** tab → **EAS Build** → **Run workflow**.
3. Choose the inputs:
   - **profile**: `production` (default) or `preview`
   - **platform**: `ios`
4. Run it. The build runs on EAS with `--no-wait`; track progress on the EAS dashboard.

Profile behavior in CI:

- **production** — builds and auto-submits to App Store Connect. The build then
  shows up in TestFlight; promoting it to the public App Store is a separate manual
  step in App Store Connect (submit for review / release).
- **preview** — internal-distribution build only, no submission. Use for ad-hoc testing.

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

## Error Tracking

[Sentry](https://sentry.io) is integrated for crash reporting and error tracking. It is disabled in development (`__DEV__`).

- **Expo plugin**: `@sentry/react-native/expo` in `app.json`
- **Initialization**: `app/_layout.tsx` (module-level `Sentry.init()` + `Sentry.wrap()`)
- **User context**: Set automatically after authentication
- **Source maps**: Uploaded during EAS builds via `SENTRY_AUTH_TOKEN`

### Required secrets for builds

| Secret | Where | Purpose |
|--------|-------|---------|
| `EXPO_TOKEN` | GitHub Actions + EAS | EAS CLI authentication |
| `SENTRY_AUTH_TOKEN` | GitHub Actions + EAS | Source map uploads to Sentry |

## Notes

- The API URL in `.env` should point to your staging or local backend
- For production builds, update the API URL to your production backend
- Google Sign-In requires native configuration (see Expo docs)
- Apple Sign-In only works on real iOS devices (not simulator)
