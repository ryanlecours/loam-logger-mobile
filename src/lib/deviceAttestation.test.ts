import { createHash } from 'crypto';
import * as Sentry from '@sentry/react-native';
import { Platform } from 'react-native';

const mockIntegrity = {
  isSupported: true,
  generateKeyAsync: jest.fn(),
  attestKeyAsync: jest.fn(),
  prepareIntegrityTokenProviderAsync: jest.fn(),
  requestIntegrityCheckAsync: jest.fn(),
};

jest.mock('@expo/app-integrity', () => mockIntegrity);
jest.mock('@sentry/react-native', () => ({ addBreadcrumb: jest.fn() }));
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  CryptoEncoding: { HEX: 'hex' },
  digestStringAsync: jest.fn(async (_alg: string, data: string) =>
    jest.requireActual<typeof import('crypto')>('crypto').createHash('sha256').update(data).digest('hex'),
  ),
}));

import { __test, ATTESTATION_TIMEOUT_MS, getSignupAttestation, prepareDeviceAttestation } from './deviceAttestation';

const API = 'https://api.test';
const CHALLENGE = 'c'.repeat(43);
const EMAIL = ' Rider@Example.com';

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

function setPlatform(os: 'ios' | 'android' | 'web') {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
}

function challengeResponse(ok = true) {
  return { ok, status: ok ? 200 : 429, json: async () => (ok ? { challenge: CHALLENGE, expiresIn: 300 } : {}) };
}

beforeEach(() => {
  jest.clearAllMocks();
  __test.reset();
  mockIntegrity.isSupported = true;
  process.env.EXPO_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER = '22899107125';
  fetchMock.mockResolvedValue(challengeResponse());
});

describe('getSignupAttestation on iOS', () => {
  beforeEach(() => setPlatform('ios'));

  it('attests a fresh key over the challenge bound to the email as typed', async () => {
    mockIntegrity.generateKeyAsync.mockResolvedValue('key-1');
    mockIntegrity.attestKeyAsync.mockResolvedValue('attestation-blob');

    await expect(getSignupAttestation(API, EMAIL)).resolves.toEqual({
      platform: 'ios',
      challenge: CHALLENGE,
      keyId: 'key-1',
      attestation: 'attestation-blob',
    });
    expect(fetchMock).toHaveBeenCalledWith(`${API}/auth/mobile/attest-challenge`, { method: 'POST' });
    expect(mockIntegrity.attestKeyAsync).toHaveBeenCalledWith('key-1', `${CHALLENGE}.${EMAIL}`);
  });

  it('reports a device without App Attest as unsupported without asking for a challenge', async () => {
    mockIntegrity.isSupported = false;
    await expect(getSignupAttestation(API, EMAIL)).resolves.toEqual({ platform: 'ios', unsupported: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('turns any failure into clientError so signup still goes ahead', async () => {
    mockIntegrity.generateKeyAsync.mockRejectedValue(Object.assign(new Error('x'), { code: 'ERR_SERVER_UNAVAILABLE' }));
    await expect(getSignupAttestation(API, EMAIL)).resolves.toEqual({ platform: 'ios', clientError: true });

    fetchMock.mockResolvedValue(challengeResponse(false));
    await expect(getSignupAttestation(API, EMAIL)).resolves.toEqual({ platform: 'ios', clientError: true });
  });

  it('gives up after the timeout', async () => {
    jest.useFakeTimers();
    try {
      mockIntegrity.generateKeyAsync.mockReturnValue(new Promise(() => undefined));
      const pending = getSignupAttestation(API, EMAIL);
      await jest.advanceTimersByTimeAsync(ATTESTATION_TIMEOUT_MS);
      await expect(pending).resolves.toEqual({ platform: 'ios', clientError: true });
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('getSignupAttestation on Android', () => {
  beforeEach(() => setPlatform('android'));

  it('requests a token whose requestHash is hex SHA-256 of challenge and email', async () => {
    mockIntegrity.prepareIntegrityTokenProviderAsync.mockResolvedValue(undefined);
    mockIntegrity.requestIntegrityCheckAsync.mockResolvedValue('integrity-token');

    await expect(getSignupAttestation(API, EMAIL)).resolves.toEqual({
      platform: 'android',
      challenge: CHALLENGE,
      token: 'integrity-token',
    });
    expect(mockIntegrity.prepareIntegrityTokenProviderAsync).toHaveBeenCalledWith('22899107125');
    expect(mockIntegrity.requestIntegrityCheckAsync).toHaveBeenCalledWith(
      createHash('sha256').update(`${CHALLENGE}.${EMAIL}`).digest('hex'),
    );
  });

  it('prepares once and reuses the provider', async () => {
    mockIntegrity.prepareIntegrityTokenProviderAsync.mockResolvedValue(undefined);
    await prepareDeviceAttestation();
    await prepareDeviceAttestation();
    expect(mockIntegrity.prepareIntegrityTokenProviderAsync).toHaveBeenCalledTimes(1);
  });

  it('sends clientError when Play Integrity cannot be prepared, and retries next time', async () => {
    mockIntegrity.prepareIntegrityTokenProviderAsync.mockRejectedValueOnce(new Error('PLAY_STORE_NOT_FOUND'));
    await expect(getSignupAttestation(API, EMAIL)).resolves.toEqual({ platform: 'android', clientError: true });
    expect(fetchMock).not.toHaveBeenCalled();

    mockIntegrity.prepareIntegrityTokenProviderAsync.mockResolvedValue(undefined);
    await expect(prepareDeviceAttestation()).resolves.toBe(true);
  });

  it('gives up after the timeout', async () => {
    jest.useFakeTimers();
    try {
      mockIntegrity.prepareIntegrityTokenProviderAsync.mockResolvedValue(undefined);
      mockIntegrity.requestIntegrityCheckAsync.mockReturnValue(new Promise(() => undefined));
      const pending = getSignupAttestation(API, EMAIL);
      await jest.advanceTimersByTimeAsync(ATTESTATION_TIMEOUT_MS);
      await expect(pending).resolves.toEqual({ platform: 'android', clientError: true });
    } finally {
      jest.useRealTimers();
    }
  });

  it('puts the Play error message in the breadcrumb when there is no code', async () => {
    mockIntegrity.prepareIntegrityTokenProviderAsync.mockRejectedValueOnce(new Error('PLAY_STORE_NOT_FOUND'));
    await getSignupAttestation(API, EMAIL);
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Play Integrity prepare failed: PLAY_STORE_NOT_FOUND' }),
    );
  });

  it('sends clientError when the build has no cloud project number', async () => {
    delete process.env.EXPO_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER;
    await expect(getSignupAttestation(API, EMAIL)).resolves.toEqual({ platform: 'android', clientError: true });
    expect(mockIntegrity.prepareIntegrityTokenProviderAsync).not.toHaveBeenCalled();
  });
});

describe('a build without the native module (Expo Go, an older dev client)', () => {
  beforeEach(() => __test.failModuleLoad());

  it('reports iOS as unsupported without fetching a challenge', async () => {
    setPlatform('ios');
    await expect(getSignupAttestation(API, EMAIL)).resolves.toEqual({ platform: 'ios', unsupported: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports Android as unsupported too, without preparing or fetching', async () => {
    setPlatform('android');
    await expect(getSignupAttestation(API, EMAIL)).resolves.toEqual({ platform: 'android', unsupported: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

it('sends nothing from other platforms', async () => {
  setPlatform('web');
  await expect(getSignupAttestation(API, EMAIL)).resolves.toBeUndefined();
});
