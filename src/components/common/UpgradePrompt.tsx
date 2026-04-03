import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';

interface UpgradePromptProps {
  message: string;
  showReferral?: boolean;
  onUpgrade?: () => void;
  onReferral?: () => void;
}

export function UpgradePrompt({
  message,
  showReferral = true,
  onUpgrade,
  onReferral,
}: UpgradePromptProps) {
  const router = useRouter();

  const handleUpgrade = onUpgrade ?? (() => router.push('/settings-detail/pricing' as Href));
  const handleReferral = onReferral ?? (() => router.push('/(tabs)/settings' as Href));

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
        {showReferral && (
          <TouchableOpacity style={styles.referralButton} onPress={handleReferral}>
            <Ionicons name="share-outline" size={16} color={colors.primary} />
            <Text style={styles.referralText}>Refer a friend</Text>
          </TouchableOpacity>
        )}
      </View>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 14,
  },
  message: {
    flex: 1,
    fontSize: 14,
    color: colors.monitor,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
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
  referralButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  referralText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
});
