// Exists for expo-sqlite's web backend. The native app never needed a custom
// Metro config, but CI validates the web bundle (expo export --platform web),
// and expo-sqlite on web ships a wa-sqlite.wasm that Metro only resolves once
// wasm is a recognized asset extension.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('wasm');

// SharedArrayBuffer, which wa-sqlite uses, requires a cross-origin-isolated
// page. Only affects the local `expo start --web` dev server; the exported
// bundle's host sets its own headers.
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => (req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    middleware(req, res, next);
  },
};

module.exports = config;
