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
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Included with Pro, see plans"
    >
      <Text style={styles.chipText}>Pro</Text>
    </TouchableOpacity>
  );
}

/**
 * Dismissible feature upsell card driven by the shared copy map.
 * Dismissal is persisted per feature in SecureStore and respected until the
 * user's situation materially changes: pass `rearmKey` as a comma-separated
 * token set (e.g. the ids of parts past their service interval). A dismissal
 * stores the set of tokens it covered (legacy dismissals stored the literal
 * '1', which participates as an ordinary token), so each NEW token re-arms
 * the card exactly once, while shrinking or repeating token sets stay
 * dismissed. Pass `persist={false}` for cards revealed by an explicit user
 * action: they should show every time the action is taken, so dismissal is
 * session-only.
 */
export function UpsellCard({
  feature,
  rearmKey,
  body,
  persist = true,
  onDismiss,
}: {
  feature: UpsellFeature;
  rearmKey?: string;
  body?: string;
  persist?: boolean;
  onDismiss?: () => void;
}) {
  const router = useRouter();
  const copy = UPSELL_COPY[feature];
  // Start hidden until the persisted dismissal state loads, so a dismissed
  // card never flashes in.
  const [visible, setVisible] = useState(!persist);

  useEffect(() => {
    if (!persist) return;
    let cancelled = false;
    const tokens = rearmKey === undefined ? [] : rearmKey.split(',').filter(Boolean);
    SecureStore.getItemAsync(copy.dismissKey)
      .then((v) => {
        if (cancelled) return;
        if (v === null) {
          setVisible(true);
          return;
        }
        const covered = new Set(v.split(','));
        setVisible(!tokens.every((t) => covered.has(t)));
      })
      .catch(() => {
        if (!cancelled) setVisible(true);
      });
    return () => {
      cancelled = true;
    };
  }, [copy.dismissKey, rearmKey, persist]);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    onDismiss?.();
    if (!persist) return;
    const tokens = rearmKey === undefined ? [] : rearmKey.split(',').filter(Boolean);
    SecureStore.getItemAsync(copy.dismissKey)
      .then((v) => {
        const covered = new Set(v ? v.split(',') : []);
        covered.add('1');
        tokens.forEach((t) => covered.add(t));
        return SecureStore.setItemAsync(copy.dismissKey, Array.from(covered).join(','));
      })
      .catch(() => {
        // Storage unavailable — dismissed for this session only.
      });
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardDismiss}
        onPress={dismiss}
        // 14pt icon: hitSlop carries it to 46pt without growing a close X that
        // sits in the card's corner.
        hitSlop={16}
        accessibilityRole="button"
        accessibilityLabel={`Dismiss: ${copy.title}`}
      >
        <Ionicons name="close" size={14} color={colors.textMuted} />
      </TouchableOpacity>
      <Text style={styles.cardTitle}>{copy.title}</Text>
      <Text style={styles.cardBody}>{body ?? copy.body}</Text>
      <TouchableOpacity
        style={styles.cardButton}
        onPress={() => router.push('/settings-detail/pricing' as Href)}
        accessibilityRole="button"
        accessibilityLabel="See Pro plans"
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
    // Deliberately not 44pt tall. This is a small inline mark sitting beside
    // text; growing the box would wreck the line it sits in. The target comes
    // from hitSlop instead (21 + 24 = 45pt), which is what hitSlop is for.
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
    minHeight: 44,
    justifyContent: 'center',
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
