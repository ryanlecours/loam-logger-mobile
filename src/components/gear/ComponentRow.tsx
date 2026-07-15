import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  restricted?: boolean;
  onPress?: () => void;
}

export function ComponentRow({ component, status, hoursRemaining, hoursSinceService, ridesSinceService, restricted, onPress }: ComponentRowProps) {
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

  return (
    <TouchableOpacity
      style={[styles.container, restricted && styles.containerRestricted]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      {restricted ? (
        <Ionicons name="lock-closed" size={12} color={colors.textMuted} />
      ) : (
        <StatusDot status={effectiveStatus} />
      )}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.type, restricted && styles.textRestricted]}>
            {label}
          </Text>
          {!restricted && hoursText && (
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
          {restricted && (
            <Text style={styles.restrictedLabel}>Pro</Text>
          )}
        </View>
        {brandModel && (
          <Text style={[styles.brandModel, restricted && styles.textRestricted]} numberOfLines={1}>
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
    gap: 12,
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
    color: colors.danger,
    fontWeight: '600',
  },
  hoursDueNow: {
    color: colors.warning,
    fontWeight: '500',
  },
  brandModel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  containerRestricted: {
    opacity: 0.5,
  },
  textRestricted: {
    color: colors.textMuted,
  },
  restrictedLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.monitor,
    backgroundColor: colors.monitorBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
    marginLeft: 8,
  },
});
