const { withInfoPlist } = require('@expo/config-plugins');

/**
 * Strips the location permission that installing react-native-maps adds by itself.
 *
 * `@expo/prebuild-config`'s unversioned react-native-maps plugin injects
 * `NSLocationWhenInUseUsageDescription` ("Allow $(PRODUCT_NAME) to access your
 * location") and the two Android location permissions purely because the
 * package resolves. It never checks whether the app reads location:
 *
 *   node_modules/@expo/prebuild-config/build/plugins/unversioned/react-native-maps.js
 *
 * We draw a route the server already stored and never touch the device's
 * position. Shipping that purpose string would declare a capability we do not
 * use, which is a privacy-label problem on the App Store and an obvious
 * question during review. Setting the key ourselves in app.json does not help,
 * because the injected value is `existing || DEFAULT` and any value we set is
 * still a location declaration.
 *
 * Config-plugin mods run in reverse registration order: withMod invokes its own
 * action, then the previously registered one. Plugins listed in app.json are
 * registered before the unversioned defaults are applied, so this runs after
 * the injection and wins.
 *
 * Verify after changing anything here: run `npx expo prebuild -p ios --clean`,
 * then grep the generated Info.plist under ios for "NSLocation" and expect no
 * matches.
 *
 * Delete this plugin the day the app genuinely shows the user's position on a
 * map. At that point the permission is legitimate and needs a real, specific
 * purpose string rather than Expo's generic default.
 */
module.exports = function withoutMapLocationPermission(config) {
  return withInfoPlist(config, (c) => {
    delete c.modResults.NSLocationWhenInUseUsageDescription;
    delete c.modResults.NSLocationAlwaysAndWhenInUseUsageDescription;
    return c;
  });
};
