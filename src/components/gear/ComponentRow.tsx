import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusDot } from './StatusDot';
import { ComponentFieldsFragment } from '../../graphql/generated';

interface ComponentRowProps {
  component: ComponentFieldsFragment;
  status?: string;
  hoursRemaining?: number | null;
  onPress?: () => void;
}

function formatComponentType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatLocation(location: string | null | undefined): string {
  if (!location) return '';
  return location
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

export function ComponentRow({ component, status, hoursRemaining, onPress }: ComponentRowProps) {
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
      const remaining = component.serviceDueAtHours - (component.hoursUsed || 0);
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
      style={styles.container}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <StatusDot status={effectiveStatus} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.type}>
            {typeName}
            {location ? ` (${location})` : ''}
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
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
    color: '#1f2937',
    flex: 1,
  },
  hours: {
    fontSize: 13,
    color: '#6b7280',
    marginLeft: 8,
  },
  hoursOverdue: {
    color: '#ef4444',
    fontWeight: '600',
  },
  hoursDueNow: {
    color: '#f97316',
    fontWeight: '500',
  },
  brandModel: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
});
