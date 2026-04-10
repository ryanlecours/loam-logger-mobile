import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusDot } from '../gear/StatusDot';
import { colors } from '../../constants/theme';
import type { ComponentPrediction } from '../../graphql/generated';

interface CalibrationComponentRowProps {
  component: ComponentPrediction;
  isCalibrated: boolean;
  isSelected: boolean;
  onToggleSelection: () => void;
  onAcknowledge: () => void;
  onSnooze: () => void;
  disabled: boolean;
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

export function CalibrationComponentRow({
  component,
  isCalibrated,
  isSelected,
  onToggleSelection,
  onAcknowledge,
  onSnooze,
  disabled,
}: CalibrationComponentRowProps) {
  const typeName = formatComponentType(component.componentType);
  const location = formatLocation(component.location);
  const brandModel = [component.brand, component.model].filter(Boolean).join(' ');
  const label = location ? `${location} ${typeName}` : typeName;

  if (isCalibrated) {
    return (
      <View style={[styles.row, styles.rowCalibrated]}>
        <Ionicons name="checkmark-circle" size={24} color={colors.good} />
        <View style={styles.content}>
          <Text style={[styles.typeName, styles.textCalibrated]}>{label}</Text>
          {brandModel ? (
            <Text style={[styles.brandModel, styles.textCalibrated]}>{brandModel}</Text>
          ) : null}
        </View>
        <Text style={[styles.statusLabel, styles.textCalibrated]}>Calibrated</Text>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <TouchableOpacity onPress={onToggleSelection} style={styles.checkbox} disabled={disabled}>
        <Ionicons
          name={isSelected ? 'checkbox' : 'square-outline'}
          size={24}
          color={isSelected ? colors.primary : colors.textMuted}
        />
      </TouchableOpacity>
      <StatusDot status={component.status} />
      <View style={styles.content}>
        <Text style={styles.typeName}>{label}</Text>
        {brandModel ? <Text style={styles.brandModel}>{brandModel}</Text> : null}
        <Text style={styles.hours}>
          {component.hoursSinceService.toFixed(0)}h since service
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={onAcknowledge}
          style={styles.actionButton}
          disabled={disabled}
        >
          <Ionicons name="checkmark" size={18} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onSnooze}
          style={styles.actionButton}
          disabled={disabled}
        >
          <Ionicons name="time-outline" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  rowCalibrated: {
    opacity: 0.5,
  },
  checkbox: {
    width: 24,
  },
  content: {
    flex: 1,
  },
  typeName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  brandModel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 1,
  },
  hours: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  textCalibrated: {
    color: colors.textMuted,
  },
  statusLabel: {
    fontSize: 13,
    color: colors.good,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
