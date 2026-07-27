import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, healthTone, radius, space, type } from '../../constants/theme';
import { ComponentHealthBadge } from '../gear/ComponentHealthBadge';

interface DashboardComponentCardProps {
  name: string;
  installDate?: string;
  currentHours: number;
  serviceIntervalHours: number;
  status: string;
  onReset?: () => void;
  onPress?: () => void;
}

export function DashboardComponentCard({
  name,
  installDate,
  currentHours,
  serviceIntervalHours,
  status,
  onReset,
  onPress,
}: DashboardComponentCardProps) {
  const percentage = serviceIntervalHours > 0
    ? Math.min(100, Math.round((currentHours / serviceIntervalHours) * 100))
    : 0;
  const tone = healthTone(status);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={styles.header}>
        <View style={styles.nameContainer}>
          <Text style={styles.name}>{name}</Text>
          {installDate && (
            <Text style={styles.installDate}>Since {installDate}</Text>
          )}
        </View>
        {onReset && (
          <TouchableOpacity onPress={onReset} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="refresh" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.progressContainer}>
        <View
          style={styles.progressTrack}
          accessibilityRole="progressbar"
          accessibilityLabel={`${name} service interval used`}
          accessibilityValue={{ min: 0, max: 100, now: percentage }}
        >
          <View
            style={[
              styles.progressBar,
              {
                width: `${percentage}%`,
                backgroundColor: tone.base,
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.hoursText}>
          {currentHours.toFixed(0)}h  /  {serviceIntervalHours.toFixed(0)}h  ·  {percentage}%
        </Text>
        <ComponentHealthBadge status={status} size="small" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: space.xl,
    marginBottom: space.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: space.lg,
  },
  nameContainer: {
    flex: 1,
  },
  name: {
    ...type.bodyStrong,
    color: colors.textPrimary,
  },
  installDate: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: space.hair,
  },
  progressContainer: {
    marginBottom: space.lg,
  },
  progressTrack: {
    height: space.sm,
    backgroundColor: colors.cardBorder,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: radius.full,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space.md,
  },
  hoursText: {
    ...type.caption,
    color: colors.textSecondary,
  },
});
