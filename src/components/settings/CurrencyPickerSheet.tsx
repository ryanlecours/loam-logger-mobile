import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { BottomSheet } from '../common/BottomSheet';
import { colors } from '../../constants/theme';
import { SUPPORTED_CURRENCIES, type CurrencyCode } from '../../lib/money';

const CURRENCY_NAMES: Record<CurrencyCode, string> = {
  USD: 'US dollar',
  CAD: 'Canadian dollar',
  EUR: 'Euro',
  GBP: 'British pound',
  AUD: 'Australian dollar',
  NZD: 'New Zealand dollar',
  CHF: 'Swiss franc',
  SEK: 'Swedish krona',
  NOK: 'Norwegian krone',
  DKK: 'Danish krone',
  JPY: 'Japanese yen',
  ZAR: 'South African rand',
  MXN: 'Mexican peso',
  BRL: 'Brazilian real',
};

interface CurrencyPickerSheetProps {
  visible: boolean;
  selected: CurrencyCode;
  onSelect: (code: CurrencyCode) => void;
  onClose: () => void;
}

/** The one list of currencies, used by Settings and by the service sheets. */
export function CurrencyPickerSheet({ visible, selected, onSelect, onClose }: CurrencyPickerSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeight="70%">
      <View style={styles.header}>
        <Text style={styles.title}>Currency</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Close">
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <Text style={styles.subtitle}>
        New costs are entered in this currency. Amounts you already recorded keep theirs.
      </Text>
      <ScrollView style={styles.list}>
        {SUPPORTED_CURRENCIES.map((code) => {
          const active = code === selected;
          return (
            <TouchableOpacity
              key={code}
              style={styles.row}
              onPress={() => {
                onSelect(code);
                onClose();
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${code}, ${CURRENCY_NAMES[code]}`}
            >
              <Text style={[styles.code, active && styles.codeActive]}>{code}</Text>
              <Text style={styles.name}>{CURRENCY_NAMES[code]}</Text>
              {active && <Ionicons name="checkmark" size={18} color={colors.positiveOn} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 4 },
  title: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  closeButton: { padding: 4 },
  subtitle: { fontSize: 13, color: colors.textSecondary, paddingHorizontal: 20, paddingBottom: 8, lineHeight: 18 },
  list: { flexShrink: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  code: { width: 48, fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  codeActive: { color: colors.positiveOn },
  name: { flex: 1, fontSize: 14, color: colors.textSecondary },
});
