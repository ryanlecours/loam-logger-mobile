import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { colors, radius } from '../../constants/theme';
import { UPSELL_COPY, type UpsellFeature } from '../../constants/upsellCopy';

interface UpgradePromptProps {
  message: string;
  onUpgrade?: () => void;
}

export function UpgradePrompt({ message, onUpgrade }: UpgradePromptProps) {
  const router = useRouter();

  const handleUpgrade = onUpgrade ?? (() => router.push('/settings-detail/pricing' as Href));

  return (
    <View style={styles.container}>
      {/* No padlock. A lock says "you are shut out"; the copy already says
          what Pro adds, and the icon was doing the emotional work of making
          the absence feel like a fault. */}
      <Text style={styles.message}>{message}</Text>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.upgradeButton}
          onPress={handleUpgrade}
          accessibilityRole="button"
          accessibilityLabel="See Pro plans"
        >
          <Text style={styles.upgradeText}>See Pro</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * Quiet inline "Pro" chip for spots where a gated value would render.
 * No copy of its own — tapping opens the paywall. Use at most one full
 * UpsellCard per screen; every other gated spot gets this chip.
 */
export function ProChip() {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={styles.chip}
      onPress={() => router.push('/settings-detail/pricing' as Href)}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Included with Pro, see plans"
    >
      <Text style={styles.chipText}>Pro</Text>
    </TouchableOpacity>
  );
}

/**
 * Dismissible feature upsell card driven by the shared copy map.
 * Dismissal is persisted per feature in SecureStore and respected forever.
 */
export function UpsellCard({ feature }: { feature: UpsellFeature }) {
  const router = useRouter();
  const copy = UPSELL_COPY[feature];
  // Start hidden until the persisted dismissal state loads, so a dismissed
  // card never flashes in.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    SecureStore.getItemAsync(copy.dismissKey)
      .then((v) => {
        if (!cancelled && v !== '1') setVisible(true);
      })
      .catch(() => {
        if (!cancelled) setVisible(true);
      });
    return () => {
      cancelled = true;
    };
  }, [copy.dismissKey]);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    SecureStore.setItemAsync(copy.dismissKey, '1').catch(() => {
      // Storage unavailable — dismissed for this session only.
    });
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardDismiss} onPress={dismiss} hitSlop={8} accessibilityLabel="Dismiss">
        <Ionicons name="close" size={14} color={colors.textMuted} />
      </TouchableOpacity>
      <Text style={styles.cardTitle}>{copy.title}</Text>
      <Text style={styles.cardBody}>{copy.body}</Text>
      <TouchableOpacity
        style={styles.cardButton}
        onPress={() => router.push('/settings-detail/pricing' as Href)}
      >
        <Text style={styles.cardButtonText}>See Pro</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // Commercial messaging lives in the sage family, never the health ramp.
    // A paywall must not wear the same color as a worn component.
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 14,
  },
  message: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  upgradeButton: {
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: 20,
  },
  upgradeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onPrimary,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primaryMuted,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  chipText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.textPrimary,
  },
  card: {
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: 12,
    padding: 16,
  },
  cardDismiss: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    paddingRight: 20,
  },
  cardBody: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    paddingRight: 20,
  },
  cardButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  cardButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onPrimary,
  },
});
