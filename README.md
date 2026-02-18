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

## Building for Production

```bash
# Development build (internal distribution)
eas build --profile development

# Preview build (internal distribution)
eas build --profile preview

# Production build
eas build --profile production
```

## Notes

- The API URL in `.env` should point to your staging or local backend
- For production builds, update the API URL to your production backend
- Google Sign-In requires native configuration (see Expo docs)
- Apple Sign-In only works on real iOS devices (not simulator)
