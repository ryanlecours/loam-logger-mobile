import { useEffect, useState } from 'react';
import { Alert, View, Text, Switch, StyleSheet } from 'react-native';
import {
  authenticateWithBiometric,
  getBiometricCapability,
  getBiometricLabel,
  isBiometricEnabled,
  setBiometricEnabled,
} from '../../lib/biometric';
import { colors } from '../../constants/theme';

/**
 * Settings row for enabling/disabling biometric unlock on app launch.
 * Mirrors the iOS Settings convention: when enabling, prompt biometric to
 * confirm — that way the user can't enable a credential they can't actually
 * use (e.g. enrolled Face ID on a different person's face). Disable is
 * unchallenged: easier to opt out than opt in.
 *
 * Hides itself on devices without biometric hardware / enrollment.
 */
export function BiometricUnlockSection() {
  const [available, setAvailable] = useState(false);
  const [label, setLabel] = useState('Biometric');
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const cap = await getBiometricCapability();
      const isAvail = cap.hasHardware && cap.isEnrolled;
      setAvailable(isAvail);
      setLabel(getBiometricLabel(cap));
      if (isAvail) {
        setEnabled(await isBiometricEnabled());
      }
    })();
  }, []);

  if (!available) return null;

  async function handleToggle(next: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      if (next) {
        // Confirm with a biometric prompt before persisting the opt-in —
        // catches the "wrong face enrolled" scenario before the user is
        // locked out next launch.
        const result = await authenticateWithBiometric(`Enable ${label} unlock`);
        if (!result.ok) return;
      }
      await setBiometricEnabled(next);
      setEnabled(next);
    } catch (err) {
      // SecureStore can fail (e.g. Keychain unavailable in rare states).
      // The Switch in our render is controlled by `enabled`, so leaving it
      // unchanged is already correct — the toggle visually snaps back.
      // But without an alert the user has no signal that anything went wrong.
      console.error('[BiometricUnlockSection] setBiometricEnabled failed', err);
      Alert.alert(
        'Unable to save setting',
        `We couldn't ${next ? 'enable' : 'disable'} ${label} unlock. Please try again.`,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Security</Text>
      <View style={styles.row}>
        <View style={styles.labelColumn}>
          <Text style={styles.label}>Unlock with {label}</Text>
          <Text style={styles.description}>
            Require {label} when opening the app to keep your account secure on this device.
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={handleToggle}
          disabled={busy}
          trackColor={{ true: colors.primary, false: colors.cardBorder }}
        />
      </View>
    </View>
  );
}

// Mirrors `styles.section` / `styles.sectionTitle` in app/(tabs)/settings.tsx
// so this section visually matches Profile / Display / Legal / etc. — title
// sits inside the rounded card, not floating above it. Previously the outer
// View had no background/border and the card styling lived on the inner row,
// which made the "Security" title appear outside the section.
const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.card,
    marginTop: 16,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  labelColumn: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
