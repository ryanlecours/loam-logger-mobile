import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { colors } from '../../constants/theme';

type AcquisitionCondition = 'NEW' | 'USED';

interface WearStartStepProps {
  selected: AcquisitionCondition;
  onSelect: (condition: AcquisitionCondition) => void;
  acquisitionDate?: Date | null;
  onAcquisitionDateChange?: (date: Date | null) => void;
}

interface StockOption {
  value: AcquisitionCondition;
  title: string;
  description: string;
  hint: string;
  icon: keyof typeof Ionicons.glyphMap;
  recommended?: boolean;
}

const STOCK_OPTIONS: StockOption[] = [
  {
    value: 'NEW',
    title: 'All Stock',
    description: 'Components are unchanged from the factory.',
    hint: 'Component specs come from the 99spokes database.',
    icon: 'sparkles',
    recommended: true,
  },
  {
    value: 'USED',
    title: 'Some Swapped',
    description: "I've replaced some parts since buying.",
    hint: 'You can update component details after creation.',
    icon: 'build',
  },
];

export function WearStartStep({
  selected,
  onSelect,
  acquisitionDate,
  onAcquisitionDateChange,
}: WearStartStepProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);

  const onDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date && onAcquisitionDateChange) onAcquisitionDateChange(date);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Are your components stock?</Text>
        <Text style={styles.subtitle}>
          This helps us set up accurate component tracking. You can always update details later.
        </Text>
      </View>

      <View style={styles.options}>
        {STOCK_OPTIONS.map((option) => {
          const isSelected = selected === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionCard,
                isSelected && styles.optionCardSelected,
              ]}
              onPress={() => onSelect(option.value)}
              activeOpacity={0.7}
            >
              <View style={styles.optionContent}>
                <Ionicons
                  name={option.icon}
                  size={24}
                  color={isSelected ? colors.primary : colors.textMuted}
                  style={styles.optionIcon}
                />
                <View style={styles.optionText}>
                  <View style={styles.titleRow}>
                    <Text
                      style={[
                        styles.optionTitle,
                        isSelected && styles.optionTitleSelected,
                      ]}
                    >
                      {option.title}
                    </Text>
                    {option.recommended && (
                      <View style={styles.recommendedBadge}>
                        <Text style={styles.recommendedText}>Recommended</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.optionDescription}>
                    {option.description}
                  </Text>
                  <Text style={styles.optionHint}>{option.hint}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {onAcquisitionDateChange && (
        <View style={styles.acquisitionSection}>
          <Text style={styles.acquisitionLabel}>When did you get this bike?</Text>
          <Text style={styles.acquisitionHint}>
            Sets the installed date for every stock component. Leave blank to use today.
          </Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(!showDatePicker)}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={16} color={colors.primary} />
            <Text style={styles.dateButtonText}>
              {acquisitionDate ? acquisitionDate.toLocaleDateString() : 'Use today'}
            </Text>
            {acquisitionDate && (
              <TouchableOpacity
                onPress={() => onAcquisitionDateChange(null)}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={acquisitionDate ?? new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              maximumDate={new Date()}
              onChange={onDateChange}
              themeVariant="dark"
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 6,
    lineHeight: 20,
  },
  options: {
    gap: 12,
  },
  optionCard: {
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    padding: 16,
    backgroundColor: colors.card,
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  optionIcon: {
    marginTop: 2,
  },
  optionText: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  optionTitleSelected: {
    color: colors.primary,
  },
  recommendedBadge: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  recommendedText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  optionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  optionHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  acquisitionSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
  },
  acquisitionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  acquisitionHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: 10,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primaryMuted,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  dateButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
});
