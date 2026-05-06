import * as SecureStore from 'expo-secure-store';

const CAPTURED_REFERRAL_KEY = 'captured_referral';

/** Canonical referral code format: 8 lowercase hex characters. */
export const REFERRAL_CODE_PATTERN = /^[a-f0-9]{8}$/;

function normalize(code: string): string | null {
  const trimmed = code.trim().toLowerCase();
  return REFERRAL_CODE_PATTERN.test(trimmed) ? trimmed : null;
}

export async function getCapturedReferral(): Promise<string | null> {
  const stored = await SecureStore.getItemAsync(CAPTURED_REFERRAL_KEY);
  return stored ? normalize(stored) : null;
}

export async function setCapturedReferral(code: string): Promise<void> {
  const normalized = normalize(code);
  if (!normalized) return;
  await SecureStore.setItemAsync(CAPTURED_REFERRAL_KEY, normalized);
}

export async function clearCapturedReferral(): Promise<void> {
  await SecureStore.deleteItemAsync(CAPTURED_REFERRAL_KEY);
}
