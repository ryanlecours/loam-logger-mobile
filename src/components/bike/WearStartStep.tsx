import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';

type AcquisitionCondition = 'NEW' | 'USED';

interface WearStartStepProps {
  selected: AcquisitionCondition;
  onSelect: (condition: AcquisitionCondition) => void;
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

export function WearStartStep({ selected, onSelect }: WearStartStepProps) {
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
});
