import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ImageBackground,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { getBiometricCapability, getBiometricLabel } from '../lib/biometric';
import { colors } from '../constants/theme';

/**
 * Full-screen unlock prompt shown on cold boot when the user has opted into
 * biometric unlock. Automatically invokes Face ID / Touch ID on mount and
 * provides a manual retry button + a "sign in with password" escape hatch
 * (via logout → login screen) for the case where biometrics repeatedly fail.
 */
export function LockScreen() {
  const { unlock, logout } = useAuth();
  const [biometricLabel, setBiometricLabel] = useState<string>('Biometric');
  const [unlocking, setUnlocking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const autoPromptedRef = useRef(false);

  useEffect(() => {
    getBiometricCapability().then((cap) => {
      setBiometricLabel(getBiometricLabel(cap));
    });
  }, []);

  // Auto-trigger the prompt once on mount so users don't have to tap to
  // start. Guarded with a ref so React strict-mode double-mounting in dev
  // doesn't show the system prompt twice.
  useEffect(() => {
    if (autoPromptedRef.current) return;
    autoPromptedRef.current = true;
    handleUnlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleUnlock() {
    setUnlocking(true);
    setErrorMessage(null);
    const result = await unlock();
    setUnlocking(false);
    if (result.ok) return;

    // Branch on the failure mode so we don't show misleading error copy.
    // User-cancellation is an intentional dismiss, not a failure — render
    // the retry button silently. Lockout needs distinct copy because the
    // retry button won't actually work until the OS releases the lock.
    switch (result.reason) {
      case 'cancelled':
        // Silent. The retry button is still visible for re-prompting.
        return;
      case 'lockout':
        setErrorMessage(
          `${biometricLabel} is temporarily locked. Sign in with your password to continue.`,
        );
        return;
      case 'unavailable':
        // Shouldn't reach here normally — checkAuth gates on availability
        // before setting locked=true — but if the user disabled biometrics
        // between then and now, fall back to password.
        setErrorMessage(
          `${biometricLabel} isn't available. Sign in with your password to continue.`,
        );
        return;
      case 'failed':
      default:
        setErrorMessage('Unlock failed. Tap to try again or use your password.');
        return;
    }
  }

  async function handleUsePassword() {
    // Logging out clears the stored tokens and flips `locked` to false,
    // causing the gate to route to the login screen.
    await logout();
  }

  return (
    <ImageBackground
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      source={require('../../assets/loam-logger-vertical.png')}
      style={styles.container}
      resizeMode="cover"
    >
      <View style={styles.content}>
        <TouchableOpacity
          style={[styles.unlockButton, unlocking && styles.unlockButtonDisabled]}
          onPress={handleUnlock}
          disabled={unlocking}
        >
          {unlocking ? (
            <ActivityIndicator color={colors.textPrimary} />
          ) : (
            <>
              <Ionicons name="finger-print" size={22} color={colors.textPrimary} />
              <Text style={styles.unlockButtonText}>
                Unlock with {biometricLabel}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {errorMessage && (
          <Text style={styles.failedText}>{errorMessage}</Text>
        )}

        <TouchableOpacity
          style={styles.linkButton}
          onPress={handleUsePassword}
          disabled={unlocking}
        >
          <Text style={styles.linkText}>Sign in with password</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 80,
    paddingHorizontal: 32,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    width: '100%',
  },
  unlockButtonDisabled: {
    opacity: 0.6,
  },
  unlockButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  failedText: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 16,
  },
  linkButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkText: {
    color: colors.primary,
    fontSize: 14,
  },
});
