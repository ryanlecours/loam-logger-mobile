import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  getBackfillHistory,
  triggerStravaBackfill,
  triggerGarminBackfill,
  triggerSuuntoBackfill,
  triggerWhoopBackfill,
  type BackfillRequest,
  type StravaBackfillResult,
  type GarminBackfillResult,
  type WorkoutBackfillResult,
} from '../../api/backfill';
import type { IntegrationProvider } from '../../api/integrations';
import { useUserTier } from '../../hooks/useUserTier';
import { UpsellCard } from '../common/UpgradePrompt';
import { colors, radius } from '../../constants/theme';
import { GARMIN_CONNECT_APP_NAME } from '../../constants/garminAttribution';

interface ImportRidesSheetProps {
  visible: boolean;
  onClose: () => void;
  provider: IntegrationProvider;
  onSuccess?: () => void;
}

type Step = 'select' | 'importing' | 'complete';

/**
 * Provider display names, and deliberately nothing else.
 *
 * This used to carry each provider's brand color, which then filled the sync
 * button, the header accent, the radios, the spinners and the success icon. The
 * primary action of this sheet was therefore Garmin blue or Strava orange
 * depending on who you had connected. DESIGN.md's Guest Jersey Rule reserves
 * those colors for the integrations' own logos and badges: they never color
 * Loam UI, and there is no provider mark in this sheet, only its name in the
 * title. The chrome speaks sage like the rest of the app.
 */
const PROVIDER_CONFIG: Record<IntegrationProvider, { label: string }> = {
  // The full app name, never "Garmin". Every string built from this label names
  // the connection ("Sync … Rides", "sync rides from …"), which is the context
  // the guidelines require the unabbreviated name in. Device attribution is a
  // different context and keeps using formatGarminSource().
  garmin: { label: GARMIN_CONNECT_APP_NAME },
  strava: { label: 'Strava' },
  whoop: { label: 'WHOOP' },
  suunto: { label: 'Suunto' },
};

function getStravaYearOptions(): string[] {
  // 'ytd' covers the current year (with checkpoint-resume), so the list
  // starts at last season — matching the web import modals, where each
  // year appears exactly once.
  const currentYear = new Date().getFullYear();
  const years: string[] = ['ytd'];
  for (let i = 1; i <= 5; i++) {
    years.push(String(currentYear - i));
  }
  return years;
}

// Garmin imports are rolling windows, shortest first. They nest (7 days is
// inside 30), so the rider picks exactly one.
const GARMIN_PERIOD_LABELS: Record<string, string> = {
  '7d': 'Last 7 Days',
  '14d': 'Last 14 Days',
  '30d': 'Last 30 Days',
};

function getGarminYearOptions(): string[] {
  return Object.keys(GARMIN_PERIOD_LABELS);
}

function getYearLabel(year: string, provider: string): string {
  if (year === 'ytd') {
    return provider === 'garmin' ? 'Last 30 Days' : 'Year to Date';
  }
  return GARMIN_PERIOD_LABELS[year] ?? year;
}

/**
 * Windows that keep moving, so a finished run should not lock the option: it is
 * how a rider picks up rides recorded since. Only a run in flight blocks one.
 */
function isRollingPeriod(year: string): boolean {
  return year === 'ytd' || year in GARMIN_PERIOD_LABELS;
}

export function ImportRidesSheet({
  visible,
  onClose,
  provider,
  onSuccess,
}: ImportRidesSheetProps) {
  const insets = useSafeAreaInsets();
  const { isPro } = useUserTier();
  const [step, setStep] = useState<Step>('select');
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [history, setHistory] = useState<BackfillRequest[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [result, setResult] = useState<
    StravaBackfillResult | GarminBackfillResult | WorkoutBackfillResult | null
  >(null);

  const config = PROVIDER_CONFIG[provider];

  // Fetch backfill history when sheet opens
  useEffect(() => {
    if (visible) {
      setStep('select');
      setSelectedYear(null);
      setResult(null);
      setHistoryLoading(true);
      getBackfillHistory(provider)
        .then(setHistory)
        .catch(() => setHistory([]))
        .finally(() => setHistoryLoading(false));
    }
  }, [visible, provider]);

  const getYearStatus = useCallback(
    (year: string): BackfillRequest | undefined => {
      return history.find(
        (r) => r.year === year && r.provider === provider
      );
    },
    [history, provider]
  );

  const handleImport = useCallback(async () => {
    if (!selectedYear) return;

    setStep('importing');

    try {
      let importResult:
        | StravaBackfillResult
        | GarminBackfillResult
        | WorkoutBackfillResult;

      switch (provider) {
        case 'strava':
          importResult = await triggerStravaBackfill(selectedYear);
          break;
        case 'garmin':
          importResult = await triggerGarminBackfill(selectedYear);
          break;
        case 'suunto':
          importResult = await triggerSuuntoBackfill(selectedYear);
          break;
        case 'whoop':
          importResult = await triggerWhoopBackfill(selectedYear);
          break;
      }

      setResult(importResult);
      setStep('complete');
      onSuccess?.();
    } catch (err) {
      setStep('select');
      Alert.alert('Import Failed', (err as Error).message);
    }
  }, [selectedYear, provider, onSuccess]);

  const handleClose = useCallback(() => {
    setStep('select');
    setSelectedYear(null);
    setResult(null);
    onClose();
  }, [onClose]);

  const yearOptions = provider === 'garmin' ? getGarminYearOptions() : getStravaYearOptions();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <View style={styles.handle} />

              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerAccent} />
                <Text style={styles.title}>Sync {config.label} Rides</Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {step === 'select' && (
                <>
                  <Text style={styles.subtitle}>
                    Select a time period to sync rides from {config.label}
                  </Text>

                  {historyLoading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color={colors.primary} />
                    </View>
                  ) : (
                    <ScrollView style={styles.yearList} showsVerticalScrollIndicator={false}>
                      {yearOptions.map((year) => {
                        const request = getYearStatus(year);
                        const isCompleted = request?.status === 'completed';
                        const isInProgress = request?.status === 'pending' || request?.status === 'in_progress';
                        const isSelected = selectedYear === year;
                        const rolling = isRollingPeriod(year);
                        // Past seasons are a Pro feature: free accounts can
                        // import the current year only. Mirrors the server's
                        // canBackfillYear, which accepts 'ytd', the rolling
                        // windows, and the literal current-year entry.
                        const isProLocked =
                          !isPro &&
                          !rolling &&
                          parseInt(year, 10) !== new Date().getFullYear();
                        const isDisabled =
                          (isCompleted && !rolling) || isInProgress || isProLocked;

                        return (
                          <TouchableOpacity
                            key={year}
                            style={[
                              styles.yearItem,
                              isSelected && styles.yearItemSelected,
                              isDisabled && styles.yearItemDisabled,
                            ]}
                            onPress={() => !isDisabled && setSelectedYear(year)}
                            disabled={isDisabled}
                            activeOpacity={0.7}
                          >
                            <View style={styles.yearRadio}>
                              {isCompleted && !rolling ? (
                                // `positive` is the theme's confirmations-and-completed-work
                                // role. The emerald #10b981 that was here is a stoplight
                                // green, which DESIGN.md's palette does not contain.
                                <Ionicons name="checkmark-circle" size={24} color={colors.positiveOn} />
                              ) : isInProgress ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                              ) : isProLocked ? (
                                // No padlock: a dimmed radio + the "Included
                                // with Pro" meta line carry the gate neutrally.
                                <Ionicons name="radio-button-off" size={24} color={colors.cardBorder} />
                              ) : isSelected ? (
                                <Ionicons name="radio-button-on" size={24} color={colors.primary} />
                              ) : (
                                <Ionicons name="radio-button-off" size={24} color={colors.cardBorder} />
                              )}
                            </View>
                            <View style={styles.yearContent}>
                              <Text style={[styles.yearLabel, isDisabled && styles.yearLabelDisabled]}>
                                {getYearLabel(year, provider)}
                              </Text>
                              {isCompleted && request?.ridesFound != null && (
                                <Text style={styles.yearMeta}>
                                  {request.ridesFound} ride{request.ridesFound !== 1 ? 's' : ''} synced
                                </Text>
                              )}
                              {isInProgress && (
                                <Text style={styles.yearMeta}>Sync in progress...</Text>
                              )}
                              {isProLocked && !isCompleted && !isInProgress && (
                                <Text style={styles.yearMeta}>Included with Pro</Text>
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}

                  {!isPro && provider !== 'garmin' && (
                    <View style={styles.importUpsell}>
                      <UpsellCard feature="importDepth" />
                    </View>
                  )}

                  {provider === 'garmin' && (
                    <Text style={styles.garminNote}>
                      Garmin sends the rides in the window you pick. New rides keep syncing automatically, and you can run this again anytime.
                    </Text>
                  )}

                  {provider === 'whoop' && (
                    <Text style={styles.garminNote}>
                      WHOOP doesn&apos;t share GPS coordinates, so location and weather data won&apos;t be available for WHOOP rides.
                    </Text>
                  )}

                  {provider === 'suunto' && (
                    <Text style={styles.garminNote}>
                      Suunto doesn&apos;t provide gear mapping, so rides will be auto-assigned to your bike if you only have one.
                    </Text>
                  )}

                  <View style={styles.footer}>
                    <TouchableOpacity
                      style={[
                        styles.importButton,
                        !selectedYear && styles.importButtonDisabled,
                      ]}
                      onPress={handleImport}
                      disabled={!selectedYear}
                    >
                      <Ionicons name="download-outline" size={20} color={colors.onPrimary} />
                      <Text style={styles.importButtonText}>
                        {selectedYear ? `Sync ${getYearLabel(selectedYear, provider)}` : 'Sync Rides'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {step === 'importing' && (
                <View style={styles.processingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.processingTitle}>
                    Syncing rides from {config.label}...
                  </Text>
                  <Text style={styles.processingSubtitle}>
                    {provider === 'garmin'
                      ? 'Queuing your sync request...'
                      : 'This may take a minute or two.'}
                  </Text>
                </View>
              )}

              {step === 'complete' && result && (
                <View style={styles.completeContainer}>
                  <View style={styles.completeIcon}>
                    <Ionicons name="checkmark-circle" size={48} color={colors.positiveOn} />
                  </View>

                  {provider === 'strava' && 'imported' in result && 'updated' in result ? (
                    <>
                      <Text style={styles.completeTitle}>Sync Complete</Text>
                      <Text style={styles.completeMessage}>{result.message}</Text>
                      <View style={styles.statsRow}>
                        <View style={styles.stat}>
                          <Text style={styles.statValue}>{result.imported}</Text>
                          <Text style={styles.statLabel}>New</Text>
                        </View>
                        <View style={styles.stat}>
                          <Text style={styles.statValue}>{result.updated ?? result.skipped ?? 0}</Text>
                          <Text style={styles.statLabel}>Updated</Text>
                        </View>
                      </View>
                    </>
                  ) : (provider === 'suunto' || provider === 'whoop') &&
                    'cyclingWorkouts' in result ? (
                    <>
                      <Text style={styles.completeTitle}>Sync Complete</Text>
                      <Text style={styles.completeMessage}>{result.message}</Text>
                      <View style={styles.statsRow}>
                        <View style={styles.stat}>
                          <Text style={styles.statValue}>{result.imported}</Text>
                          <Text style={styles.statLabel}>New</Text>
                        </View>
                        <View style={styles.stat}>
                          <Text style={styles.statValue}>{result.skipped}</Text>
                          <Text style={styles.statLabel}>Skipped</Text>
                        </View>
                        <View style={styles.stat}>
                          <Text style={styles.statValue}>{result.cyclingWorkouts}</Text>
                          <Text style={styles.statLabel}>Total</Text>
                        </View>
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={styles.completeTitle}>Sync Queued</Text>
                      <Text style={styles.completeMessage}>
                        Your rides will sync in the background. Check back in a few minutes to see them appear.
                      </Text>
                    </>
                  )}

                  <View style={styles.footer}>
                    <TouchableOpacity
                      style={styles.importButton}
                      onPress={handleClose}
                    >
                      <Text style={styles.importButtonText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  garminNote: {
    fontSize: 12,
    color: colors.textMuted,
    paddingHorizontal: 20,
    paddingTop: 8,
    lineHeight: 16,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.cardBorder,
    borderRadius: radius.full,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerAccent: {
    width: 4,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  yearList: {
    maxHeight: 320,
  },
  yearItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  yearItemSelected: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primaryBorder,
  },
  yearItemDisabled: {
    opacity: 0.6,
  },
  yearRadio: {
    width: 24,
  },
  yearContent: {
    flex: 1,
  },
  yearLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  yearLabelDisabled: {
    color: colors.textMuted,
  },
  yearMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  importUpsell: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  footer: {
    padding: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    gap: 8,
  },
  importButtonDisabled: {
    opacity: 0.5,
  },
  importButtonText: {
    // Obsidian, not white. DESIGN.md bans pure #FFF outright, and a flat sage
    // fill takes obsidian ink: cream on sage is 3.37:1 and fails AA, while
    // obsidian on sage reads 5.05:1.
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  processingContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 16,
  },
  processingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  processingSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  completeContainer: {
    // The footer is a CHILD here, where in the select step it is a sibling of
    // the sheet. A centered container therefore sized the footer to its
    // content, so the Done button and the hairline above it hugged the word
    // "Done" instead of spanning the sheet. The container stretches and each
    // child centers itself; horizontal padding is left to the children so the
    // footer keeps the same 20pt inset as the select step's sync button
    // rather than doubling it.
    paddingTop: 20,
    alignItems: 'stretch',
  },
  completeIcon: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: colors.positiveBg,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  completeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  completeMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    // 32 = the container's old 20pt padding plus this block's own 12pt
    // tightening, so the copy sits exactly where it did before.
    paddingHorizontal: 32,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
