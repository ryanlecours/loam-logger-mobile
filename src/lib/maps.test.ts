import { canDrawNativeMap, mapUnavailableText } from './maps';
import * as fs from 'fs';
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

describe('mapUnavailableText', () => {
  it('names the missing setting only in development builds', () => {
    expect(mapUnavailableText('Route map unavailable', false)).toBe('Route map unavailable');
    expect(mapUnavailableText('Route map unavailable', true)).toBe(
      'Route map unavailable\nGOOGLE_MAPS_ANDROID_API_KEY is not set'
    );
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
  const savedServices = process.env.GOOGLE_SERVICES_JSON;
  // A developer's local google-services.json must not leak into these cases.
  let localServicesFile: jest.SpyInstance;
  beforeEach(() => {
    localServicesFile = jest.spyOn(fs, 'existsSync').mockReturnValue(false);
  });
  afterEach(() => {
    localServicesFile.mockRestore();
    if (saved === undefined) delete process.env.GOOGLE_MAPS_ANDROID_API_KEY;
    else process.env.GOOGLE_MAPS_ANDROID_API_KEY = saved;
    if (savedServices === undefined) delete process.env.GOOGLE_SERVICES_JSON;
    else process.env.GOOGLE_SERVICES_JSON = savedServices;
  });

  it('injects the Android Maps key from the environment and flags maps on', () => {
    process.env.GOOGLE_MAPS_ANDROID_API_KEY = ' test-key ';
    const config = appConfig({ config: base } as never);

    expect(config.android?.config?.googleMaps?.apiKey).toBe('test-key');
    expect(config.android?.package).toBe('com.loamlabs.loamlogger');
    expect(config.extra).toEqual({ eas: { projectId: 'p' }, androidMapsEnabled: true });
  });

  describe('on EAS', () => {
    const easVars = ['EAS_BUILD', 'EAS_BUILD_PLATFORM', 'EAS_BUILD_PROFILE'] as const;
    const savedEas = Object.fromEntries(easVars.map((k) => [k, process.env[k]]));
    afterEach(() => {
      for (const k of easVars) {
        if (savedEas[k] === undefined) delete process.env[k];
        else process.env[k] = savedEas[k];
      }
    });
    const onEas = (platform: string, profile: string) => {
      process.env.EAS_BUILD = 'true';
      process.env.EAS_BUILD_PLATFORM = platform;
      process.env.EAS_BUILD_PROFILE = profile;
    };

    it('fails a production Android build that has no Maps key', () => {
      delete process.env.GOOGLE_MAPS_ANDROID_API_KEY;
      onEas('android', 'production');
      expect(() => appConfig({ config: base } as never)).toThrow(/GOOGLE_MAPS_ANDROID_API_KEY is not set/);
    });

    it('lets iOS and preview builds through without a key', () => {
      delete process.env.GOOGLE_MAPS_ANDROID_API_KEY;
      onEas('ios', 'production');
      expect(() => appConfig({ config: base } as never)).not.toThrow();
      onEas('android', 'preview');
      expect(appConfig({ config: base } as never).extra?.androidMapsEnabled).toBe(false);
    });

    it('fails a production Android build that has no Firebase config', () => {
      process.env.GOOGLE_MAPS_ANDROID_API_KEY = 'k';
      delete process.env.GOOGLE_SERVICES_JSON;
      onEas('android', 'production');
      expect(() => appConfig({ config: base } as never)).toThrow(/GOOGLE_SERVICES_JSON is not set/);
    });

    it('builds production Android when the key and Firebase config are set', () => {
      process.env.GOOGLE_MAPS_ANDROID_API_KEY = 'k';
      process.env.GOOGLE_SERVICES_JSON = '/home/expo/workingdir/google-services.json';
      onEas('android', 'production');
      const config = appConfig({ config: base } as never);
      expect(config.extra?.androidMapsEnabled).toBe(true);
      expect(config.android?.googleServicesFile).toBe('/home/expo/workingdir/google-services.json');
    });
  });

  it('uses a local google-services.json at the project root when there is no EAS file', () => {
    delete process.env.GOOGLE_SERVICES_JSON;
    localServicesFile.mockReturnValue(true);
    expect(appConfig({ config: base } as never).android?.googleServicesFile).toBe('./google-services.json');
  });

  it('leaves the Firebase config out when there is none, so local builds still work', () => {
    delete process.env.GOOGLE_SERVICES_JSON;
    expect(appConfig({ config: base } as never).android?.googleServicesFile).toBeUndefined();
  });

  it('leaves the manifest key out and flags maps off when there is no key', () => {
    delete process.env.GOOGLE_MAPS_ANDROID_API_KEY;
    const config = appConfig({ config: base } as never);

    expect(config.android?.config?.googleMaps).toBeUndefined();
    expect(config.extra?.androidMapsEnabled).toBe(false);
  });
});
