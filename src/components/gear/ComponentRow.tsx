import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusDot } from './StatusDot';
import { ComponentFieldsFragment } from '../../graphql/generated';
import { colors } from '../../constants/theme';

interface ComponentRowProps {
  component: ComponentFieldsFragment;
  status?: string;
  hoursRemaining?: number | null;
  restricted?: boolean;
  onPress?: () => void;
}

function formatComponentType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatLocation(location: string | null | undefined): string {
  if (!location || location === 'NONE') return '';
  return location
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

export function ComponentRow({ component, status, hoursRemaining, restricted, onPress }: ComponentRowProps) {
  const typeName = formatComponentType(component.type);
  const location = formatLocation(component.location);
  const brandModel = [component.brand, component.model].filter(Boolean).join(' ');
  const effectiveStatus = status || component.status || 'UNKNOWN';

  const getHoursText = () => {
    if (hoursRemaining !== undefined && hoursRemaining !== null) {
      if (hoursRemaining <= 0) {
        return `${Math.abs(hoursRemaining).toFixed(0)}h overdue`;
      }
      return `${hoursRemaining.toFixed(0)}h remaining`;
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
            {typeName}
            {location ? ` (${location})` : ''}
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
