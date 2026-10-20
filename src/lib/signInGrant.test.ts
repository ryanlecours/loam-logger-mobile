const mockStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn((key: string) => Promise.resolve(mockStore.get(key) ?? null)),
  setItemAsync: jest.fn((key: string, value: string) => {
    mockStore.set(key, value);
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((key: string) => {
    mockStore.delete(key);
    return Promise.resolve();
  }),
}));

import * as SecureStore from 'expo-secure-store';
import {
  clearSignInGrant,
  emailSignInPollDelay,
  readSignInGrant,
  saveSignInGrant,
  signInGrantFromDetails,
} from './signInGrant';

const KEY = 'email_sign_in_grant';
const inAnHour = () => new Date(Date.now() + 60 * 60 * 1000).toISOString();

beforeEach(() => {
  mockStore.clear();
  jest.clearAllMocks();
});

describe('signInGrantFromDetails', () => {
  it('reads the grant out of an EMAIL_VERIFICATION_REQUIRED answer', () => {
    expect(
      signInGrantFromDetails(
        { email: 'rider@example.com', signInSecret: 's', signInSecretExpiresAt: '2026-10-21T12:00:00.000Z' },
        'rider@example.com',
      ),
    ).toEqual({ secret: 's', expiresAt: '2026-10-21T12:00:00.000Z', email: 'rider@example.com' });
  });

  it('is null for an API that sent no grant', () => {
    expect(signInGrantFromDetails({ email: 'rider@example.com' })).toBeNull();
    expect(signInGrantFromDetails(undefined)).toBeNull();
  });

  it('is null for a malformed grant', () => {
    expect(signInGrantFromDetails({ signInSecret: '', signInSecretExpiresAt: '2026-10-21T12:00:00Z' })).toBeNull();
    expect(signInGrantFromDetails({ signInSecret: 's', signInSecretExpiresAt: 'soon' })).toBeNull();
    expect(signInGrantFromDetails({ signInSecret: 42, signInSecretExpiresAt: '2026-10-21T12:00:00Z' })).toBeNull();
  });
});

describe('stored grant', () => {
  it('round-trips through SecureStore, replacing any earlier one', async () => {
    await saveSignInGrant({ secret: 'first', expiresAt: inAnHour() });
    const second = { secret: 'second', expiresAt: inAnHour(), email: 'rider@example.com' };
    await saveSignInGrant(second);

    await expect(readSignInGrant()).resolves.toEqual(second);
  });

  it('reads as none once expired, and is deleted', async () => {
    mockStore.set(KEY, JSON.stringify({ secret: 's', expiresAt: new Date(Date.now() - 1000).toISOString() }));

    await expect(readSignInGrant()).resolves.toBeNull();
    expect(mockStore.has(KEY)).toBe(false);
  });

  it('reads as none when the stored value is unusable', async () => {
    mockStore.set(KEY, JSON.stringify({ secret: 's' }));
    await expect(readSignInGrant()).resolves.toBeNull();

    mockStore.set(KEY, 'not json');
    await expect(readSignInGrant()).resolves.toBeNull();
  });

  it('can be cleared', async () => {
    await saveSignInGrant({ secret: 's', expiresAt: inAnHour() });
    await clearSignInGrant();
    await expect(readSignInGrant()).resolves.toBeNull();
  });

  it('never throws when the keychain fails', async () => {
    (SecureStore.setItemAsync as jest.Mock).mockRejectedValueOnce(new Error('keychain'));
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValueOnce(new Error('keychain'));
    (SecureStore.deleteItemAsync as jest.Mock).mockRejectedValueOnce(new Error('keychain'));

    await expect(saveSignInGrant({ secret: 's', expiresAt: inAnHour() })).resolves.toBeUndefined();
    await expect(readSignInGrant()).resolves.toBeNull();
    await expect(clearSignInGrant()).resolves.toBeUndefined();
  });
});

describe('emailSignInPollDelay', () => {
  it('asks often at first, then backs off', () => {
    expect(emailSignInPollDelay(0)).toBe(3_000);
    expect(emailSignInPollDelay(2 * 60_000 - 1)).toBe(3_000);
    expect(emailSignInPollDelay(2 * 60_000)).toBe(10_000);
    expect(emailSignInPollDelay(10 * 60_000)).toBe(30_000);
  });
});
