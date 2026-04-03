import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Share, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useUserTier } from '../../hooks/useUserTier';
import { useReferralStatsQuery } from '../../graphql/generated';
import { colors } from '../../constants/theme';

export function ReferralSection() {
  const { data } = useReferralStatsQuery();
  const { isFreeLight } = useUserTier();
  const [copied, setCopied] = useState(false);

  const stats = data?.referralStats;
  if (!stats?.referralCode) return null;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(stats.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Track your mountain bike maintenance with Loam Logger! Sign up with my link: ${stats.referralLink}`,
      });
    } catch {
      // User cancelled share
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Referral Program</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Ionicons name="share-outline" size={20} color={colors.primary} />
          <View style={styles.info}>
            <Text style={styles.heading}>
              {isFreeLight
                ? 'Share with a friend to unlock all components'
                : 'Invite friends to Loam Logger'}
            </Text>
            {isFreeLight && (
              <Text style={styles.description}>
                When they complete onboarding, you unlock Full Bike Analysis — wear tracking on all 23+ component types.
              </Text>
            )}
          </View>
        </View>

        <View style={styles.linkRow}>
          <TextInput
            style={styles.linkInput}
            value={stats.referralLink}
            editable={false}
            selectTextOnFocus
          />
          <TouchableOpacity style={styles.copyButton} onPress={handleCopy}>
            <Ionicons
              name={copied ? 'checkmark' : 'copy-outline'}
              size={16}
              color={colors.primary}
            />
            <Text style={styles.copyText}>{copied ? 'Copied' : 'Copy'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-social-outline" size={18} color={colors.textPrimary} />
          <Text style={styles.shareText}>Share Link</Text>
        </TouchableOpacity>

        {(stats.pendingCount > 0 || stats.completedCount > 0) && (
          <View style={styles.statsRow}>
            <Text style={styles.stat}>{stats.pendingCount} pending</Text>
            <Text style={styles.stat}>{stats.completedCount} completed</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  info: {
    flex: 1,
  },
  heading: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  linkInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    color: colors.textMuted,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryMuted,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  copyText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 12,
  },
  shareText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
