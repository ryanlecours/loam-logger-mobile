import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { CalibrationComponentRow } from './CalibrationComponentRow';
import { colors } from '../../constants/theme';
import type { ComponentPrediction } from '../../graphql/generated';

interface BikeCalibrationSectionProps {
  bikeName: string;
  components: ComponentPrediction[];
  isExpanded: boolean;
  onToggleExpanded: () => void;
  calibratedIds: Set<string>;
  selectedIds: Set<string>;
  onToggleSelection: (componentId: string) => void;
  bulkDate: Date;
  onBulkDateChange: (date: Date) => void;
  onBulkApply: () => void;
  onSnooze: (componentId: string) => void;
  onAcknowledge: (componentId: string) => void;
  disabled: boolean;
}

export function BikeCalibrationSection({
  bikeName,
  components,
  isExpanded,
  onToggleExpanded,
  calibratedIds,
  selectedIds,
  onToggleSelection,
  bulkDate,
  onBulkDateChange,
  onBulkApply,
  onSnooze,
  onAcknowledge,
  disabled,
}: BikeCalibrationSectionProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);

  const uncalibratedCount = components.filter((c) => !calibratedIds.has(c.componentId)).length;
  const allCalibrated = uncalibratedCount === 0;

  const uncalibratedComponents = components.filter((c) => !calibratedIds.has(c.componentId));
  const allSelected = uncalibratedComponents.length > 0 && uncalibratedComponents.every((c) => selectedIds.has(c.componentId));
  const selectedCount = uncalibratedComponents.filter((c) => selectedIds.has(c.componentId)).length;

  const handleToggleAll = useCallback(() => {
    if (allSelected) {
      uncalibratedComponents.forEach((c) => onToggleSelection(c.componentId));
    } else {
      uncalibratedComponents
        .filter((c) => !selectedIds.has(c.componentId))
        .forEach((c) => onToggleSelection(c.componentId));
    }
  }, [allSelected, uncalibratedComponents, selectedIds, onToggleSelection]);

  const onDateChange = useCallback(
    (_event: DateTimePickerEvent, date?: Date) => {
      if (Platform.OS === 'android') setShowDatePicker(false);
      if (date) onBulkDateChange(date);
    },
    [onBulkDateChange]
  );

  const isToday = bulkDate.toDateString() === new Date().toDateString();

  return (
    <View style={styles.section}>
      <TouchableOpacity style={styles.header} onPress={onToggleExpanded} activeOpacity={0.7}>
        <View style={styles.headerLeft}>
          <Text style={styles.bikeName}>{bikeName}</Text>
          {allCalibrated ? (
            <View style={styles.doneBadge}>
              <Ionicons name="checkmark-circle" size={14} color={colors.good} />
              <Text style={styles.doneText}>All set</Text>
            </View>
          ) : (
            <Text style={styles.countText}>
              {uncalibratedCount} component{uncalibratedCount !== 1 ? 's' : ''} need attention
            </Text>
          )}
        </View>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {isExpanded && !allCalibrated && (
        <>
          <View style={styles.bulkAction}>
            <TouchableOpacity
              onPress={handleToggleAll}
              style={styles.selectAllRow}
              disabled={disabled}
            >
              <Ionicons
                name={allSelected ? 'checkbox' : 'square-outline'}
                size={20}
                color={allSelected ? colors.primary : colors.textMuted}
              />
              <Text style={styles.selectAllText}>
                {allSelected ? 'Deselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>

            <View style={styles.bulkRow}>
              <Text style={styles.bulkLabel}>Last serviced</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(!showDatePicker)}
                disabled={disabled}
              >
                <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                <Text style={styles.dateButtonText}>
                  {isToday ? 'Today' : bulkDate.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={bulkDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                maximumDate={new Date()}
                onChange={onDateChange}
                themeVariant="dark"
              />
            )}

            <TouchableOpacity
              style={[styles.applyButton, selectedCount === 0 && styles.applyButtonDisabled]}
              onPress={onBulkApply}
              disabled={selectedCount === 0 || disabled}
            >
              <Text style={styles.applyButtonText}>
                Apply to {selectedCount > 0 ? `${selectedCount} selected` : 'selected'}
              </Text>
            </TouchableOpacity>
          </View>

          {components.map((component) => (
            <CalibrationComponentRow
              key={component.componentId}
              component={component}
              isCalibrated={calibratedIds.has(component.componentId)}
              isSelected={selectedIds.has(component.componentId)}
              onToggleSelection={() => onToggleSelection(component.componentId)}
              onAcknowledge={() => onAcknowledge(component.componentId)}
              onSnooze={() => onSnooze(component.componentId)}
              disabled={disabled}
            />
          ))}
        </>
      )}

      {isExpanded && allCalibrated && (
        <View style={styles.allDone}>
          <Ionicons name="checkmark-circle-outline" size={32} color={colors.good} />
          <Text style={styles.allDoneText}>All components calibrated</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  headerLeft: {
    flex: 1,
  },
  bikeName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  countText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  doneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  doneText: {
    fontSize: 13,
    color: colors.good,
    fontWeight: '500',
  },
  bulkAction: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 10,
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  bulkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bulkLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryMuted,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  dateButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  applyButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonDisabled: {
    opacity: 0.5,
  },
  applyButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  allDone: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  allDoneText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
});
