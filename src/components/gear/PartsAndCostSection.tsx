import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius } from '../../constants/theme';
import { MoneyInput, isMoneyTextInvalid } from '../common/MoneyInput';
import { majorToMinor, minorToInput } from '../../lib/money';

export const MAX_SERVICE_PARTS = 20;

/** A part as the rider is entering it; amounts stay as typed until submit. */
export interface PartDraft {
  key: string;
  brand: string;
  model: string;
  price: string;
  vendor: string;
}

let nextKey = 0;
export const newPartDraft = (): PartDraft => ({
  key: `part-${Date.now()}-${nextKey++}`,
  brand: '',
  model: '',
  price: '',
  vendor: '',
});

/** The input the API takes, from a validated draft list. */
export function partsToInput(parts: PartDraft[], currency: string) {
  return parts
    .filter((p) => p.model.trim() !== '')
    .map((p) => ({
      brand: p.brand.trim() || null,
      model: p.model.trim(),
      priceMinor: p.price.trim() === '' ? null : majorToMinor(p.price, currency),
      vendor: p.vendor.trim() || null,
    }));
}

/** Sum of the parts' prices in minor units, or null when none is priced. */
export function sumPartPrices(parts: PartDraft[], currency: string): number | null {
  let total: number | null = null;
  for (const p of parts) {
    const minor = p.price.trim() === '' ? null : majorToMinor(p.price, currency);
    if (minor != null) total = (total ?? 0) + minor;
  }
  return total;
}

/** Anything the rider typed that the API would refuse. */
export function partsAndCostInvalid(cost: string, parts: PartDraft[], currency: string): boolean {
  if (isMoneyTextInvalid(cost, currency)) return true;
  return parts.some(
    (p) => isMoneyTextInvalid(p.price, currency) || (p.model.trim() === '' && (p.brand.trim() || p.price.trim() || p.vendor.trim()))
  );
}

interface PartsAndCostSectionProps {
  currency: string;
  cost: string;
  onCostChange: (text: string) => void;
  parts: PartDraft[];
  onPartsChange: (parts: PartDraft[]) => void;
  /** The component's own brand and model, to spot a whole-part replacement. */
  componentBrandModel?: string | null;
  /** Shown when the rider should use Replace instead; omit to hide the hint. */
  onReplaceInstead?: () => void;
  /** Start open (an edit of a log that already has cost or parts). */
  initiallyExpanded?: boolean;
  /** When false, the section explains why it is unavailable instead of its fields. */
  enabled?: boolean;
  disabledHint?: string;
  inputAccessoryViewID?: string;
  /** Lets the sheet open the same currency list Settings uses. */
  onChangeCurrency?: () => void;
}

/**
 * The collapsed "Parts and cost" block under a service's date. Closed by
 * default so the two-tap "log it" path stays two taps. The total pre-fills
 * from priced parts when the rider has not typed one and stays editable;
 * the server stores whatever is sent.
 */
export function PartsAndCostSection({
  currency,
  cost,
  onCostChange,
  parts,
  onPartsChange,
  componentBrandModel,
  onReplaceInstead,
  initiallyExpanded = false,
  enabled = true,
  disabledHint,
  inputAccessoryViewID,
  onChangeCurrency,
}: PartsAndCostSectionProps) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  // The last total this section filled in itself. The total is only
  // rewritten while it is empty or still equal to that fill, so a cost the
  // rider typed, or one an existing log was seeded with after mount, is never
  // replaced by the sum of the parts (which would drop labour).
  const [autoFill, setAutoFill] = useState<string | null>(null);

  const refillTotal = (next: PartDraft[]) => {
    if (cost.trim() !== '' && cost !== autoFill) return;
    const sum = sumPartPrices(next, currency);
    const text = sum == null ? '' : minorToInput(sum, currency);
    setAutoFill(text);
    onCostChange(text);
  };

  const updatePart = (key: string, patch: Partial<PartDraft>) => {
    const next = parts.map((p) => (p.key === key ? { ...p, ...patch } : p));
    onPartsChange(next);
    if (patch.price !== undefined) refillTotal(next);
  };

  const removePart = (key: string) => {
    const next = parts.filter((p) => p.key !== key);
    onPartsChange(next);
    refillTotal(next);
  };

  const normalizedComponent = (componentBrandModel ?? '').trim().toLowerCase();
  const looksLikeReplacement =
    !!onReplaceInstead &&
    normalizedComponent !== '' &&
    parts.some((p) => {
      const name = `${p.brand} ${p.model}`.trim().toLowerCase();
      return name !== '' && p.brand.trim() !== '' && name !== normalizedComponent && !normalizedComponent.includes(name) && !name.includes(normalizedComponent) && name.split(' ').length >= 2;
    });

  const summary = (() => {
    const bits: string[] = [];
    if (cost.trim() !== '') bits.push(`${currency} ${cost.trim()}`);
    const named = parts.filter((p) => p.model.trim() !== '').length;
    if (named > 0) bits.push(`${named} part${named === 1 ? '' : 's'}`);
    return bits.join(' · ');
  })();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.headerRow}
        onPress={() => setExpanded((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={expanded ? 'Hide parts and cost' : 'Show parts and cost'}
      >
        <Text style={styles.headerLabel}>Parts and cost</Text>
        <View style={styles.headerRight}>
          {!expanded && summary !== '' && <Text style={styles.headerSummary}>{summary}</Text>}
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textMuted}
          />
        </View>
      </TouchableOpacity>

      {expanded && !enabled && (
        <Text style={styles.hint}>{disabledHint}</Text>
      )}

      {expanded && enabled && (
        <View style={styles.body}>
          <View style={styles.costRow}>
            <View style={styles.costLabelRow}>
              <Text style={styles.fieldLabel}>Cost</Text>
              {onChangeCurrency && (
                <TouchableOpacity
                  onPress={onChangeCurrency}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Currency ${currency}. Change currency.`}
                >
                  <Text style={styles.currencyLink}>{currency} ▾</Text>
                </TouchableOpacity>
              )}
            </View>
            <MoneyInput
              currency={currency}
              value={cost}
              onChangeText={(t) => {
                setAutoFill(null);
                onCostChange(t);
              }}
              inputAccessoryViewID={inputAccessoryViewID}
              style={styles.costInput}
              accessibilityLabel="Total cost of this service"
            />
          </View>
          <Text style={styles.hint}>Parts and labour together, what you actually paid.</Text>

          {parts.map((part, index) => (
            <View key={part.key} style={styles.partCard}>
              <View style={styles.partHeader}>
                <Text style={styles.partTitle}>Part {index + 1}</Text>
                <TouchableOpacity
                  onPress={() => removePart(part.key)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove part ${index + 1}`}
                >
                  <Ionicons name="close-circle-outline" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <View style={styles.partRow}>
                <TextInput
                  value={part.brand}
                  onChangeText={(t) => updatePart(part.key, { brand: t })}
                  style={[styles.input, styles.partHalf]}
                  placeholder="Brand"
                  placeholderTextColor={colors.textMuted}
                  inputAccessoryViewID={inputAccessoryViewID}
                  accessibilityLabel={`Part ${index + 1} brand`}
                />
                <TextInput
                  value={part.model}
                  onChangeText={(t) => updatePart(part.key, { model: t })}
                  style={[styles.input, styles.partHalf]}
                  placeholder="Model or description"
                  placeholderTextColor={colors.textMuted}
                  inputAccessoryViewID={inputAccessoryViewID}
                  accessibilityLabel={`Part ${index + 1} model`}
                />
              </View>
              <View style={styles.partRow}>
                <MoneyInput
                  currency={currency}
                  value={part.price}
                  onChangeText={(t) => updatePart(part.key, { price: t })}
                  placeholder="Price"
                  inputAccessoryViewID={inputAccessoryViewID}
                  style={styles.partHalf}
                  accessibilityLabel={`Part ${index + 1} price`}
                />
                <TextInput
                  value={part.vendor}
                  onChangeText={(t) => updatePart(part.key, { vendor: t })}
                  style={[styles.input, styles.partHalf]}
                  placeholder="Where bought"
                  placeholderTextColor={colors.textMuted}
                  inputAccessoryViewID={inputAccessoryViewID}
                  accessibilityLabel={`Part ${index + 1} where bought`}
                />
              </View>
            </View>
          ))}

          {parts.length < MAX_SERVICE_PARTS && (
            <TouchableOpacity
              style={styles.addPart}
              onPress={() => onPartsChange([...parts, newPartDraft()])}
              accessibilityRole="button"
              accessibilityLabel="Add a part"
            >
              <Ionicons name="add" size={18} color={colors.primary} />
              <Text style={styles.addPartText}>Add part</Text>
            </TouchableOpacity>
          )}

          {looksLikeReplacement && onReplaceInstead && (
            <TouchableOpacity onPress={onReplaceInstead} accessibilityRole="button">
              <Text style={styles.replaceHint}>
                Replacing the whole part? Use Replace so its hours start at zero.
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
    marginTop: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 44,
  },
  headerLabel: { fontSize: 14, color: colors.textSecondary },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerSummary: { fontSize: 13, color: colors.textPrimary },
  body: { gap: 10, paddingBottom: 8 },
  costRow: { gap: 6 },
  costLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldLabel: { fontSize: 14, color: colors.textSecondary },
  currencyLink: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  costInput: {},
  hint: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },
  partCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 10,
    gap: 8,
  },
  partHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  partTitle: { fontSize: 12, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  partRow: { flexDirection: 'row', gap: 8 },
  partHalf: { flex: 1 },
  input: {
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: colors.textPrimary,
    fontSize: 14,
    minHeight: 44,
  },
  addPart: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
  addPartText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  replaceHint: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, textDecorationLine: 'underline' },
});
