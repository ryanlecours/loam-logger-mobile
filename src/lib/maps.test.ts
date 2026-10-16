import { canDrawNativeMap } from './maps';
import appConfig from '../../app.config';

describe('canDrawNativeMap', () => {
  it('always draws on iOS, which uses Apple Maps and needs no key', () => {
    expect(canDrawNativeMap('ios', undefined)).toBe(true);
    expect(canDrawNativeMap('ios', { androidMapsEnabled: false })).toBe(true);
  });

  it('draws on Android only when the build carried a Maps key', () => {
    expect(canDrawNativeMap('android', { androidMapsEnabled: true })).toBe(true);
    expect(canDrawNativeMap('android', { androidMapsEnabled: false })).toBe(false);
    expect(canDrawNativeMap('android', {})).toBe(false);
    expect(canDrawNativeMap('android', undefined)).toBe(false);
  });
});

describe('app.config', () => {
  const base = {
    name: 'Loam Logger',
    slug: 'loam-logger',
    android: { package: 'com.loamlabs.loamlogger', edgeToEdgeEnabled: true },
    extra: { eas: { projectId: 'p' } },
  };
  const saved = process.env.GOOGLE_MAPS_ANDROID_API_KEY;
  afterEach(() => {
    if (saved === undefined) delete process.env.GOOGLE_MAPS_ANDROID_API_KEY;
    else process.env.GOOGLE_MAPS_ANDROID_API_KEY = saved;
  });

  it('injects the Android Maps key from the environment and flags maps on', () => {
    process.env.GOOGLE_MAPS_ANDROID_API_KEY = ' test-key ';
    const config = appConfig({ config: base } as never);

    expect(config.android?.config?.googleMaps?.apiKey).toBe('test-key');
    expect(config.android?.package).toBe('com.loamlabs.loamlogger');
    expect(config.extra).toEqual({ eas: { projectId: 'p' }, androidMapsEnabled: true });
  });

  it('leaves the manifest key out and flags maps off when there is no key', () => {
    delete process.env.GOOGLE_MAPS_ANDROID_API_KEY;
    const config = appConfig({ config: base } as never);

    expect(config.android?.config?.googleMaps).toBeUndefined();
    expect(config.extra?.androidMapsEnabled).toBe(false);
  });
});
