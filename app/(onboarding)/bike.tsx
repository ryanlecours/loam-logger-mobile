import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useOnboarding, type SpokesBike, type SpokesImage } from '../../src/hooks/useOnboarding';
import { searchBikes, getBikeById, type SpokesSearchResult } from '../../src/api/spokes';
import { colors } from '../../src/constants/theme';
import { SpokesAttribution } from '../../src/components/common/SpokesAttribution';
import { BikeDetailsStep } from '../../src/components/bike/BikeDetailsStep';
import { WearStartStep } from '../../src/components/bike/WearStartStep';

type Step = 'search' | 'details' | 'wearStart' | 'confirm';

interface ManualForm {
  manufacturer: string;
  model: string;
  year: string;
  travelForkMm: string;
  travelShockMm: string;
}

const INITIAL_MANUAL_FORM: ManualForm = {
  manufacturer: '',
  model: '',
  year: '',
  travelForkMm: '',
  travelShockMm: '',
};

export default function BikeScreen() {
  const router = useRouter();
  const {
    data: onboardingData,
    setSelectedBike,
    setNickname,
    setNotes,
    setSelectedImageUrl,
    setAcquisitionCondition,
  } = useOnboarding();

  const [step, setStep] = useState<Step>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SpokesSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [loadingBike, setLoadingBike] = useState(false);
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [manualForm, setManualForm] = useState<ManualForm>(INITIAL_MANUAL_FORM);

  // Local state for images (not stored in onboarding context)
  const [bikeImages, setBikeImages] = useState<SpokesImage[]>([]);

  // Debounced search
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    setSearchError(null);

    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (text.length < 2) {
      setSearchResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchBikes({ query: text });
        setSearchResults(results);
      } catch (err) {
        setSearchError(err instanceof Error ? err.message : 'Search failed');
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    setSearchTimeout(timeout);
  }, [searchTimeout]);

  const handleSelectBike = useCallback(async (result: SpokesSearchResult) => {
    setLoadingBike(true);
    try {
      const fullBike = await getBikeById(result.id);
      if (fullBike) {
        setSelectedBike(fullBike);

        // Collect images
        const images: SpokesImage[] = [];
        if (fullBike.images && fullBike.images.length > 0) {
          const seen = new Set<string>();
          for (const img of fullBike.images) {
            if (img.url && !seen.has(img.url)) {
              seen.add(img.url);
              images.push(img);
            }
          }
        }
        setBikeImages(images);
        setSelectedImageUrl(fullBike.thumbnailUrl || images[0]?.url || null);
        setStep('details');
      } else {
        // Fallback to search result data
        const bike: SpokesBike = {
          id: result.id,
          maker: result.maker,
          model: result.model,
          year: result.year,
          family: result.family,
          category: result.category,
          subcategory: result.subcategory,
        };
        setSelectedBike(bike);
        setBikeImages([]);
        setSelectedImageUrl(null);
        setStep('details');
      }
    } catch (_err) {
      Alert.alert('Error', 'Failed to load bike details');
    } finally {
      setLoadingBike(false);
    }
  }, [setSelectedBike, setSelectedImageUrl]);

  const handleManualContinue = useCallback(() => {
    const { manufacturer, model, year } = manualForm;
    if (!manufacturer.trim() || !model.trim() || !year.trim()) {
      Alert.alert('Required Fields', 'Please fill in manufacturer, model, and year.');
      return;
    }
    const yearNum = parseInt(year, 10);
    if (isNaN(yearNum) || yearNum < 1990 || yearNum > new Date().getFullYear() + 1) {
      Alert.alert('Invalid Year', 'Please enter a valid year.');
      return;
    }

    const manualBike: SpokesBike = {
      id: `manual-${Date.now()}`,
      maker: manufacturer.trim(),
      model: model.trim(),
      year: yearNum,
      family: '',
      category: '',
      subcategory: null,
      travelFork: manualForm.travelForkMm ? parseInt(manualForm.travelForkMm, 10) || undefined : undefined,
      travelRear: manualForm.travelShockMm ? parseInt(manualForm.travelShockMm, 10) || undefined : undefined,
    };

    setSelectedBike(manualBike);
    setBikeImages([]);
    setSelectedImageUrl(null);
    setAcquisitionCondition('USED');
    setStep('details');
  }, [manualForm, setSelectedBike, setSelectedImageUrl, setAcquisitionCondition]);

  const handleBack = useCallback(() => {
    switch (step) {
      case 'wearStart':
        setStep('details');
        break;
      case 'details':
        setStep('search');
        setSelectedBike(null);
        setBikeImages([]);
        setSelectedImageUrl(null);
        setNickname('');
        setNotes('');
        break;
      default:
        break;
    }
  }, [step, setSelectedBike, setSelectedImageUrl, setNickname, setNotes]);

  const handleDetailsContinue = useCallback(() => {
    setStep('wearStart');
  }, []);

  const handleWearStartContinue = useCallback(() => {
    if (!onboardingData.selectedBike) {
      Alert.alert('Error', 'Please select a bike');
      return;
    }
    router.push('/(onboarding)/connect' as Href);
  }, [onboardingData.selectedBike, router]);

  const renderSearchResult = useCallback(({ item }: { item: SpokesSearchResult }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleSelectBike(item)}
      disabled={loadingBike}
    >
      <View style={styles.resultContent}>
        <Text style={styles.resultMake}>{item.maker}</Text>
        <Text style={styles.resultModel}>{item.model}</Text>
        <Text style={styles.resultYear}>{item.year} • {item.category}</Text>
      </View>
      <Text style={styles.resultArrow}>›</Text>
    </TouchableOpacity>
  ), [handleSelectBike, loadingBike]);

  // --- Step: Wear Start ---

  if (step === 'wearStart') {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <ScrollView style={styles.flex}>
            <WearStartStep
              selected={onboardingData.acquisitionCondition}
              onSelect={setAcquisitionCondition}
            />
          </ScrollView>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={handleWearStartContinue}
            >
              <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleBack}
            >
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // --- Step: Details ---

  if (step === 'details') {
    const bike = onboardingData.selectedBike;
    if (!bike) {
      setStep('search');
      return null;
    }

    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <BikeDetailsStep
            bike={bike}
            images={bikeImages}
            selectedImageUrl={onboardingData.selectedImageUrl}
            onSelectImage={setSelectedImageUrl}
            nickname={onboardingData.nickname}
            onNicknameChange={setNickname}
            notes={onboardingData.notes}
            onNotesChange={setNotes}
          />

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={handleDetailsContinue}
            >
              <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleBack}
            >
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // --- Step: Search ---

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Add Your Bike</Text>
        <Text style={styles.subtitle}>Search for your bike to auto-fill specs</Text>

        {!isManualEntry ? (
          <>
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={handleSearchChange}
                placeholder="Search by make and model..."
                placeholderTextColor={colors.textMuted}
                autoFocus
                autoCapitalize="words"
                autoCorrect={false}
              />
              {searching && (
                <ActivityIndicator style={styles.searchSpinner} color={colors.primary} />
              )}
            </View>

            <SpokesAttribution />

            {searchError && (
              <Text style={styles.errorText}>{searchError}</Text>
            )}

            {loadingBike && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading bike details...</Text>
              </View>
            )}

            <FlatList
              data={searchResults}
              renderItem={renderSearchResult}
              keyExtractor={(item) => item.id}
              style={styles.resultsList}
              contentContainerStyle={styles.resultsListContent}
              ListEmptyComponent={
                searchQuery.length >= 2 && !searching ? (
                  <Text style={styles.emptyText}>No bikes found. Try a different search.</Text>
                ) : searchQuery.length < 2 ? (
                  <Text style={styles.hintText}>
                    Start typing to search for your bike{'\n'}
                    (e.g., "Santa Cruz Hightower" or "Trek Fuel EX")
                  </Text>
                ) : null
              }
              ListFooterComponent={
                <TouchableOpacity
                  style={styles.manualEntryButton}
                  onPress={() => setIsManualEntry(true)}
                >
                  <Text style={styles.manualEntryText}>
                    Can't find your bike? Enter details manually
                  </Text>
                </TouchableOpacity>
              }
            />
          </>
        ) : (
          /* Manual entry form */
          <ScrollView style={styles.flex} contentContainerStyle={styles.manualFormContent}>
            <Text style={styles.manualFormTitle}>Enter Bike Details</Text>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Manufacturer *</Text>
              <TextInput
                style={styles.fieldInput}
                value={manualForm.manufacturer}
                onChangeText={(text) => setManualForm((f) => ({ ...f, manufacturer: text }))}
                placeholder="e.g., Santa Cruz"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Model *</Text>
              <TextInput
                style={styles.fieldInput}
                value={manualForm.model}
                onChangeText={(text) => setManualForm((f) => ({ ...f, model: text }))}
                placeholder="e.g., Bronson"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Year *</Text>
              <TextInput
                style={styles.fieldInput}
                value={manualForm.year}
                onChangeText={(text) => setManualForm((f) => ({ ...f, year: text }))}
                placeholder="e.g., 2024"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>

            <View style={styles.fieldRow}>
              <View style={[styles.field, styles.fieldHalf]}>
                <Text style={styles.fieldLabel}>Fork Travel (mm)</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={manualForm.travelForkMm}
                  onChangeText={(text) => setManualForm((f) => ({ ...f, travelForkMm: text }))}
                  placeholder="e.g., 160"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.field, styles.fieldHalf]}>
                <Text style={styles.fieldLabel}>Rear Travel (mm)</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={manualForm.travelShockMm}
                  onChangeText={(text) => setManualForm((f) => ({ ...f, travelShockMm: text }))}
                  placeholder="e.g., 150"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handleManualContinue}
            >
              <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.manualEntryButton}
              onPress={() => {
                setIsManualEntry(false);
                setManualForm(INITIAL_MANUAL_FORM);
              }}
            >
              <Text style={styles.manualEntryText}>Back to search</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 76,
    marginBottom: 8,
    color: colors.primary,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: colors.textSecondary,
    marginBottom: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.textPrimary,
  },
  searchSpinner: {
    marginLeft: 8,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  resultsList: {
    flex: 1,
  },
  resultsListContent: {
    paddingBottom: 24,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  resultContent: {
    flex: 1,
  },
  resultMake: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  resultModel: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  resultYear: {
    fontSize: 14,
    color: colors.textMuted,
  },
  resultArrow: {
    fontSize: 24,
    color: colors.textMuted,
    marginLeft: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 40,
  },
  hintText: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 40,
    lineHeight: 22,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 10, 10, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  buttonContainer: {
    gap: 12,
    marginTop: 'auto',
    paddingBottom: 40,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  manualEntryButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  manualEntryText: {
    fontSize: 14,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
  manualFormContent: {
    paddingBottom: 40,
  },
  manualFormTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 24,
  },
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  fieldInput: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldHalf: {
    flex: 1,
  },
});
