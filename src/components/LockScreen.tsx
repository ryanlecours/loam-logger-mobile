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
  const [failed, setFailed] = useState(false);
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
    setFailed(false);
    const ok = await unlock();
    setUnlocking(false);
    if (!ok) setFailed(true);
  }

  async function handleUsePassword() {
    // Logging out clears the stored tokens and flips `locked` to false,
    // causing the gate to route to the login screen.
    await logout();
  }

  return (
    <ImageBackground
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

        {failed && (
          <Text style={styles.failedText}>
            Unlock failed. Tap to try again or use your password.
          </Text>
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
