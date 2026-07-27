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

/** Spoken forms of the ramp. The badge's visual label is title case; speech is not. */
const STATUS_SPEECH: Record<string, string> = {
  OVERDUE: 'overdue',
  DUE_NOW: 'due now',
  DUE_SOON: 'due soon',
  ALL_GOOD: 'all good',
};

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
  const spokenStatus = STATUS_SPEECH[status] ?? 'status unknown';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
      accessibilityRole="button"
      // One stop for the whole card. Read as separate elements this was four
      // fragments ("Fork", "142h / 100h · 142%", "Overdue") with no stated
      // relationship between them.
      accessibilityLabel={`${name}, ${spokenStatus}, ${currentHours.toFixed(0)} of ${serviceIntervalHours.toFixed(0)} hours used`}
      accessibilityState={{ disabled: !onPress }}
    >
      <View style={styles.header}>
        <View style={styles.nameContainer}>
          <Text style={styles.name}>{name}</Text>
          {installDate && (
            <Text style={styles.installDate}>Since {installDate}</Text>
          )}
        </View>
        {onReset && (
          <TouchableOpacity
            onPress={onReset}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={`Reset ${name} wear baseline`}
          >
            <Ionicons name="refresh" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.progressContainer}>
        {/* The card label above already speaks the hours and the status, so the
            bar is decoration to a screen reader rather than a third stop. */}
        <View style={styles.progressTrack} accessibilityElementsHidden>
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
