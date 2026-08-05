import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusDot } from './StatusDot';
import { ComponentFieldsFragment } from '../../graphql/generated';
import { colors } from '../../constants/theme';
import { formatComponentType } from '../../utils/formatComponentType';

interface ComponentRowProps {
  component: ComponentFieldsFragment;
  status?: string | null;
  hoursRemaining?: number | null;
  /** Raw usage from the prediction — shown when hoursRemaining is gated (free tier). */
  hoursSinceService?: number | null;
  ridesSinceService?: number | null;
  /** Off for the last row in a grouped list, whose container draws the edge. */
  showDivider?: boolean;
  onPress?: () => void;
}

const STATUS_SPOKEN: Record<string, string> = {
  OVERDUE: 'overdue',
  DUE_NOW: 'due now',
  DUE_SOON: 'due soon',
  ALL_GOOD: 'good',
};

export function ComponentRow({ component, status, hoursRemaining, hoursSinceService, ridesSinceService, showDivider = true, onPress }: ComponentRowProps) {
  const label = formatComponentType(component.type, component.location);
  const brandModel = [component.brand, component.model].filter(Boolean).join(' ');
  const effectiveStatus = status || component.status || 'UNKNOWN';

  const getHoursText = () => {
    if (hoursRemaining !== undefined && hoursRemaining !== null) {
      if (hoursRemaining <= 0) {
        return `${Math.abs(hoursRemaining).toFixed(0)}h overdue`;
      }
      return `${hoursRemaining.toFixed(0)}h remaining`;
    }
    // Free tier: remaining hours are gated — show raw usage instead.
    if (hoursSinceService !== undefined && hoursSinceService !== null) {
      if (ridesSinceService !== undefined && ridesSinceService !== null) {
        return `${hoursSinceService.toFixed(0)}h · ${ridesSinceService} rides since service`;
      }
      return `${hoursSinceService.toFixed(0)}h since service`;
    }
    if (component.hoursUsed !== null && component.serviceDueAtHours) {
      return `${component.hoursUsed?.toFixed(0) || 0} / ${component.serviceDueAtHours}h`;
    }
    if (component.hoursUsed !== null) {
      return `${component.hoursUsed?.toFixed(0) || 0}h used`;
    }
    return null;
  };

  const hoursText = getHoursText();

  // The dot and the color of the hours text carry the status visually; neither
  // reaches a screen reader, so the status is spoken into the row's own label.
  const spokenStatus = STATUS_SPOKEN[effectiveStatus];
  const accessibilityLabel = [label, brandModel, spokenStatus, hoursText]
    .filter(Boolean)
    .join(', ');

  return (
    <TouchableOpacity
      style={[
        styles.container,
        showDivider && styles.containerDivided,
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !onPress }}
    >
      <StatusDot status={effectiveStatus} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.type}>
            {label}
          </Text>
          {hoursText && (
            <Text
              style={[
                styles.hours,
                effectiveStatus === 'OVERDUE' && styles.hoursOverdue,
                effectiveStatus === 'DUE_NOW' && styles.hoursDueNow,
              ]}
            >
              {hoursText}
            </Text>
          )}
        </View>
        {brandModel && (
          <Text style={styles.brandModel} numberOfLines={1}>
            {brandModel}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    // A row with no brand/model line is only ~42pt of content and padding,
    // which lands just under the 44pt floor.
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.card,
    gap: 12,
  },
  containerDivided: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  type: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
    flex: 1,
  },
  hours: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  hoursOverdue: {
    color: colors.health.overdue.on,
    fontWeight: '600',
  },
  hoursDueNow: {
    color: colors.health.dueNow.on,
    fontWeight: '500',
  },
  brandModel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
