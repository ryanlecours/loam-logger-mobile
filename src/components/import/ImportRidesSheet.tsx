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
import { Ionicons } from '@expo/vector-icons';
import {
  getBackfillHistory,
  triggerStravaBackfill,
  triggerGarminBackfill,
  type BackfillRequest,
  type StravaBackfillResult,
  type GarminBackfillResult,
} from '../../api/backfill';
import type { IntegrationProvider } from '../../api/integrations';
import { colors } from '../../constants/theme';

interface ImportRidesSheetProps {
  visible: boolean;
  onClose: () => void;
  provider: IntegrationProvider;
  onSuccess?: () => void;
}

type Step = 'select' | 'importing' | 'complete';

const PROVIDER_CONFIG = {
  garmin: { label: 'Garmin', color: '#007dc3' },
  strava: { label: 'Strava', color: '#fc4c02' },
};

function getStravaYearOptions(): string[] {
  const currentYear = new Date().getFullYear();
  const years: string[] = ['ytd'];
  for (let i = 0; i < 5; i++) {
    years.push(String(currentYear - i));
  }
  return years;
}

// Garmin limits historical data access to the past 30 days
function getGarminYearOptions(): string[] {
  return ['ytd'];
}

function getYearLabel(year: string, provider: string): string {
  if (year === 'ytd') {
    return provider === 'garmin' ? 'Last 30 Days' : 'Year to Date';
  }
  return year;
}

export function ImportRidesSheet({
  visible,
  onClose,
  provider,
  onSuccess,
}: ImportRidesSheetProps) {
  const [step, setStep] = useState<Step>('select');
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [history, setHistory] = useState<BackfillRequest[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [result, setResult] = useState<StravaBackfillResult | GarminBackfillResult | null>(null);
  const [_error, setError] = useState<string | null>(null);

  const config = PROVIDER_CONFIG[provider];

  // Fetch backfill history when sheet opens
  useEffect(() => {
    if (visible) {
      setStep('select');
      setSelectedYear(null);
      setResult(null);
      setError(null);
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
    setError(null);

    try {
      let importResult: StravaBackfillResult | GarminBackfillResult;

      if (provider === 'strava') {
        importResult = await triggerStravaBackfill(selectedYear);
      } else {
        importResult = await triggerGarminBackfill(selectedYear);
      }

      setResult(importResult);
      setStep('complete');
      onSuccess?.();
    } catch (err) {
      setError((err as Error).message);
      setStep('select');
      Alert.alert('Import Failed', (err as Error).message);
    }
  }, [selectedYear, provider, onSuccess]);

  const handleClose = useCallback(() => {
    setStep('select');
    setSelectedYear(null);
    setResult(null);
    setError(null);
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
            <View style={styles.sheet}>
              <View style={styles.handle} />

              {/* Header */}
              <View style={styles.header}>
                <View style={[styles.headerAccent, { backgroundColor: config.color }]} />
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
                      <ActivityIndicator size="small" color={config.color} />
                    </View>
                  ) : (
                    <ScrollView style={styles.yearList} showsVerticalScrollIndicator={false}>
                      {yearOptions.map((year) => {
                        const request = getYearStatus(year);
                        const isCompleted = request?.status === 'completed';
                        const isInProgress = request?.status === 'pending' || request?.status === 'in_progress';
                        const isSelected = selectedYear === year;
                        const isDisabled = isCompleted || isInProgress;

                        return (
                          <TouchableOpacity
                            key={year}
                            style={[
                              styles.yearItem,
                              isSelected && { backgroundColor: config.color + '10', borderColor: config.color },
                              isDisabled && styles.yearItemDisabled,
                            ]}
                            onPress={() => !isDisabled && setSelectedYear(year)}
                            disabled={isDisabled}
                            activeOpacity={0.7}
                          >
                            <View style={styles.yearRadio}>
                              {isCompleted ? (
                                <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                              ) : isInProgress ? (
                                <ActivityIndicator size="small" color={config.color} />
                              ) : isSelected ? (
                                <Ionicons name="radio-button-on" size={24} color={config.color} />
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
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}

                  {provider === 'garmin' && (
                    <Text style={styles.garminNote}>
                      Garmin limits historical data access to the past 30 days. New rides sync automatically going forward.
                    </Text>
                  )}

                  {/* WHOOP doesn't use this sheet (IntegrationProvider only
                      covers garmin + strava), so the WHOOP GPS disclaimer
                      lives in the WHOOP-specific sync UI instead. */}

                  <View style={styles.footer}>
                    <TouchableOpacity
                      style={[
                        styles.importButton,
                        { backgroundColor: config.color },
                        !selectedYear && styles.importButtonDisabled,
                      ]}
                      onPress={handleImport}
                      disabled={!selectedYear}
                    >
                      <Ionicons name="download-outline" size={20} color="#fff" />
                      <Text style={styles.importButtonText}>Sync Rides</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {step === 'importing' && (
                <View style={styles.processingContainer}>
                  <ActivityIndicator size="large" color={config.color} />
                  <Text style={styles.processingTitle}>
                    Syncing rides from {config.label}...
                  </Text>
                  <Text style={styles.processingSubtitle}>
                    {provider === 'strava'
                      ? 'This may take a minute or two.'
                      : 'Queuing your sync request...'}
                  </Text>
                </View>
              )}

              {step === 'complete' && result && (
                <View style={styles.completeContainer}>
                  <View style={[styles.completeIcon, { backgroundColor: config.color + '15' }]}>
                    <Ionicons name="checkmark-circle" size={48} color={config.color} />
                  </View>

                  {provider === 'strava' && 'imported' in result ? (
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
                      style={[styles.importButton, { backgroundColor: config.color }]}
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
    paddingBottom: 34,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.cardBorder,
    borderRadius: 2,
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
    borderRadius: 2,
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
    borderRadius: 10,
    gap: 8,
  },
  importButtonDisabled: {
    opacity: 0.5,
  },
  importButtonText: {
    color: '#fff',
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
    padding: 20,
    alignItems: 'center',
  },
  completeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  completeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  completeMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 32,
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
