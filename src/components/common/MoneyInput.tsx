import { View, Text, TextInput, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius } from '../../constants/theme';
import { majorToMinor } from '../../lib/money';

interface MoneyInputProps {
  /** ISO 4217 code shown as the prefix and used to read the amount. */
  currency: string;
  /** The rider's text, kept as typed so a half-finished "12." is not rewritten. */
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  inputAccessoryViewID?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  /** Called on blur with the parsed amount, or null when the text is not a plain amount. */
  onParsed?: (minor: number | null) => void;
}

/**
 * An amount field with its currency beside it. The amount is validated with
 * the same strict parser the API mirrors: an ambiguous entry (a lone "1,200",
 * "1.005", "12.") is shown as an error, never coerced into a different valid
 * number. Money is cream text like every other figure; it is never on the
 * health ramp.
 */
export function MoneyInput({
  currency,
  value,
  onChangeText,
  placeholder = '0.00',
  inputAccessoryViewID,
  style,
  accessibilityLabel,
  onParsed,
}: MoneyInputProps) {
  const trimmed = value.trim();
  const invalid = trimmed !== '' && majorToMinor(trimmed, currency) === null;

  return (
    <View style={style}>
      <View style={[styles.field, invalid && styles.fieldInvalid]}>
        <Text style={styles.prefix}>{currency}</Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onBlur={() => onParsed?.(trimmed === '' ? null : majorToMinor(trimmed, currency))}
          keyboardType="decimal-pad"
          inputAccessoryViewID={inputAccessoryViewID}
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={accessibilityLabel ?? `Amount in ${currency}`}
          accessibilityHint={invalid ? 'Not a plain amount' : undefined}
        />
      </View>
      {invalid && (
        <Text style={styles.error} accessibilityRole="alert">
          Enter a plain amount, like 85 or 85.50.
        </Text>
      )}
    </View>
  );
}

/** True when the text is non-empty and not a plain amount in the currency. */
export function isMoneyTextInvalid(value: string, currency: string): boolean {
  const trimmed = value.trim();
  return trimmed !== '' && majorToMinor(trimmed, currency) === null;
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  fieldInvalid: {
    borderColor: colors.cautionBorder,
  },
  prefix: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    paddingVertical: 8,
    textAlign: 'right',
  },
  error: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
});
