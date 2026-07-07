import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { colors } from '../../constants/theme';
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
      <View style={styles.header}>
        <Ionicons name="lock-closed" size={18} color={colors.monitor} />
        <Text style={styles.message}>{message}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade}>
          <Ionicons name="arrow-up-circle-outline" size={16} color={colors.textPrimary} />
          <Text style={styles.upgradeText}>Upgrade to Pro</Text>
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
      accessibilityLabel="Pro feature — see plans"
    >
      <Ionicons name="lock-closed" size={9} color={colors.monitor} />
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
    backgroundColor: colors.monitorBg,
    borderWidth: 1,
    borderColor: colors.monitorBg,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  message: {
    flex: 1,
    fontSize: 14,
    color: colors.monitor,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  upgradeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderColor: colors.monitor,
    backgroundColor: colors.monitorBg,
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
    color: colors.monitor,
  },
  card: {
    backgroundColor: colors.monitorBg,
    borderWidth: 1,
    borderColor: colors.monitorBg,
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
    color: colors.monitor,
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
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  cardButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
