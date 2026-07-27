/**
 * First test harness in this repo.
 *
 * `jest-expo` handles the Expo/React Native transform, the module mocks for
 * native Expo modules, and the platform-extension resolution (so a test
 * importing `./RouteMapView` picks up `RouteMapView.native.tsx`, matching what
 * a device build does).
 *
 * `transformIgnorePatterns` has to opt packages back IN to Babel. Everything
 * under node_modules is ignored by default, but React Native libraries ship
 * untranspiled ESM/JSX, so each one has to be listed or Jest chokes on the
 * first `import`. The list below is jest-expo's documented baseline plus
 * `react-native-maps`, which this repo added for the ride route map.
 */
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|react-native-maps)',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Only our own source. `app/` is expo-router's file-based routes; those are
  // screens rather than units and are not covered here.
  testMatch: ['<rootDir>/src/**/*.test.[jt]s?(x)'],
};
