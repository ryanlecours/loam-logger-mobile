import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Share,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

import {
  ComponentShareScope,
  useComponentSharesQuery,
  useCreateComponentShareMutation,
  useRevokeComponentShareMutation,
} from '../../graphql/generated';
import { colors, radius } from '../../constants/theme';
import { BottomSheet } from '../common/BottomSheet';
import { describeSaveError } from '../../utils/errorCopy';
import {
  SHARE_SCOPES,
  fmtDay,
  isRangeValid,
  rangeEndIso,
  rangeStartIso,
  shareScopeLabel,
} from '../../utils/componentShare';

interface ComponentShareSheetProps {
  visible: boolean;
  componentId: string;
  /** The component's first install: the earliest day a range may start. */
  earliestDay: Date;
  onClose: () => void;
}

/**
 * Share links for one window of a component's history: its lifetime, since
 * its last service, or a fixed date range. Each link is locked to that window,
 * so sharing "since last service" does not also hand over the part's lifetime.
 * Links open the web page, so the app only makes, shares and revokes them.
 */
export function ComponentShareSheet({
  visible,
  componentId,
  earliestDay,
  onClose,
}: ComponentShareSheetProps) {
  const [scope, setScope] = useState<ComponentShareScope>(ComponentShareScope.Lifetime);
  const [from, setFrom] = useState(earliestDay);
  const [to, setTo] = useState(() => new Date());
  const [picking, setPicking] = useState<'from' | 'to' | null>(null);

  // Start every open from the part's current first install and today. The
  // sheet stays mounted between opens, so dates seeded once go stale: after a
  // midnight, or after the history refetches with a different install date.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setFrom(earliestDay);
      setTo(new Date());
      setPicking(null);
    }
  }

  const { data, loading } = useComponentSharesQuery({
    variables: { componentId },
    skip: !visible,
    fetchPolicy: 'cache-and-network',
  });
  const [createShare, { loading: creating }] = useCreateComponentShareMutation({
    refetchQueries: ['ComponentShares'],
  });
  const [revokeShare] = useRevokeComponentShareMutation({
    refetchQueries: ['ComponentShares'],
  });
  const shares = data?.component?.shares ?? [];

  const today = new Date();
  const isRange = scope === ComponentShareScope.Range;
  // If the install date moves later while the sheet is open, a start picked
  // before it would silently disable Create. Never start before the install.
  const start = from.getTime() < earliestDay.getTime() ? earliestDay : from;
  const rangeInvalid = isRange && !isRangeValid(start, to, earliestDay, today);

  const handleClose = useCallback(() => {
    setScope(ComponentShareScope.Lifetime);
    setPicking(null);
    onClose();
  }, [onClose]);

  const shareUrl = async (url: string) => {
    try {
      await Share.share({ message: url });
    } catch {
      // The rider closed the share sheet or it failed to open. The link is in
      // the list below either way, so it can be shared from there.
    }
  };

  const handleCreate = async () => {
    try {
      const { data: created } = await createShare({
        variables: {
          input: {
            componentId,
            scope,
            ...(isRange ? { rangeStart: rangeStartIso(start), rangeEnd: rangeEndIso(to) } : {}),
          },
        },
      });
      setPicking(null);
      const url = created?.createComponentShare.url;
      if (url) await shareUrl(url);
    } catch (err) {
      const { title, body } = describeSaveError(err, 'share link');
      Alert.alert(title, body);
    }
  };

  const confirmRevoke = (id: string, label: string) => {
    Alert.alert(
      'Revoke this link?',
      `The ${label} link stops working at once for anyone who has it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              await revokeShare({ variables: { id } });
            } catch {
              // describeSaveError speaks of saving, which reads oddly for a
              // removal, and whether the revoke landed is unknown here.
              Alert.alert(
                "Couldn't revoke the link",
                'It may still work. Check your signal and try again.'
              );
            }
          },
        },
      ]
    );
  };

  const onPickDate = (event: DateTimePickerEvent, date?: Date) => {
    const which = picking;
    // The Android dialog closes on any outcome; only a 'set' picked a date.
    if (Platform.OS === 'android') setPicking(null);
    if (event.type !== 'set' || !date) return;
    if (which === 'from') setFrom(date);
    if (which === 'to') setTo(date);
  };

  return (
    <BottomSheet visible={visible} onClose={handleClose} maxHeight="90%">
      <View style={styles.header}>
        <Text style={styles.title}>Share history</Text>
        <TouchableOpacity
          onPress={handleClose}
          style={styles.closeButton}
          accessibilityRole="button"
          accessibilityLabel="Close sharing"
        >
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <Text style={styles.subtitle}>
        Anyone with a link sees that window: totals, the wear chart, the bikes it was on and
        its service dates. Notes, your name and weather are never shared.
      </Text>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.scopeRow} accessibilityRole="radiogroup" accessibilityLabel="What to share">
          {SHARE_SCOPES.map((s) => {
            const active = scope === s.scope;
            return (
              <TouchableOpacity
                key={s.scope}
                onPress={() => {
                  setScope(s.scope);
                  setPicking(null);
                }}
                style={[styles.scopePill, active && styles.scopePillActive]}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
              >
                <Text style={[styles.scopeText, active && styles.scopeTextActive]}>{s.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {scope === ComponentShareScope.SinceService && (
          <Text style={styles.hint}>
            This link keeps up: when you log a new service, it starts counting from that one.
          </Text>
        )}

        {isRange && (
          <View style={styles.rangeBlock}>
            <DateRow
              label="From"
              date={start}
              active={picking === 'from'}
              onPress={() => setPicking(picking === 'from' ? null : 'from')}
            />
            {picking === 'from' && (
              <DateTimePicker
                value={start}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                minimumDate={earliestDay}
                maximumDate={to}
                onChange={onPickDate}
                themeVariant="dark"
              />
            )}
            <DateRow
              label="To"
              date={to}
              active={picking === 'to'}
              onPress={() => setPicking(picking === 'to' ? null : 'to')}
            />
            {picking === 'to' && (
              <DateTimePicker
                value={to}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                minimumDate={start}
                maximumDate={today}
                onChange={onPickDate}
                themeVariant="dark"
              />
            )}
            {rangeInvalid && (
              <Text style={styles.hint} accessibilityRole="alert">
                Pick dates between {fmtDay(earliestDay)} and today, with From on or before To.
              </Text>
            )}
            <Text style={styles.hint}>
              A date range is fixed: it shows those days and nothing after them.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.createButton, (creating || rangeInvalid) && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={creating || rangeInvalid}
          accessibilityRole="button"
          accessibilityState={{ disabled: creating || rangeInvalid }}
        >
          {creating ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <>
              <Ionicons name="share-outline" size={18} color={colors.onPrimary} />
              <Text style={styles.createButtonText}>Create and share link</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>YOUR LINKS</Text>
        {loading && shares.length === 0 ? (
          <ActivityIndicator color={colors.primary} />
        ) : shares.length === 0 ? (
          <Text style={styles.emptyText}>No links yet.</Text>
        ) : (
          shares.map((share) => {
            const label = shareScopeLabel(share);
            return (
              <View key={share.id} style={styles.linkRow}>
                <View style={styles.linkInfo}>
                  <Text style={styles.linkLabel}>{label}</Text>
                  <Text style={styles.linkMeta} numberOfLines={1}>
                    Created {fmtDay(share.createdAt)} · {share.url}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => void shareUrl(share.url)}
                  style={styles.iconButton}
                  accessibilityRole="button"
                  accessibilityLabel={`Share the ${label} link`}
                >
                  <Ionicons name="share-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => confirmRevoke(share.id, label)}
                  style={styles.iconButton}
                  accessibilityRole="button"
                  accessibilityLabel={`Revoke the ${label} link`}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
    </BottomSheet>
  );
}

function DateRow({
  label,
  date,
  active,
  onPress,
}: {
  label: string;
  date: Date;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.dateRow}>
      <Text style={styles.dateLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.dateButton, active && styles.dateButtonActive]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label} ${fmtDay(date)}. Change date`}
      >
        <Ionicons name="calendar-outline" size={16} color={colors.primary} />
        <Text style={styles.dateButtonText}>{fmtDay(date)}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  closeButton: { padding: 4 },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  body: { flexShrink: 1 },
  bodyContent: { paddingHorizontal: 20, paddingBottom: 24, gap: 12 },
  scopeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  scopePill: {
    // 44pt minimum touch target per DESIGN.md's native mapping.
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  scopePillActive: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
  scopeText: { color: colors.textMuted, fontSize: 13 },
  scopeTextActive: { color: colors.positiveOn, fontWeight: '600' },
  hint: { fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  rangeBlock: { gap: 10 },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateLabel: { fontSize: 14, color: colors.textSecondary },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: 12,
  },
  dateButtonActive: { borderColor: colors.primary },
  dateButtonText: { fontSize: 14, fontWeight: '500', color: colors.positiveOn },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.5 },
  createButtonText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    color: colors.textMuted,
    marginTop: 12,
  },
  emptyText: { fontSize: 14, color: colors.textMuted },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  linkInfo: { flex: 1, minWidth: 0 },
  linkLabel: { fontSize: 14, color: colors.textPrimary },
  linkMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
