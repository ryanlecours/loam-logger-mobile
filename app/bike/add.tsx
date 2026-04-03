import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { searchBikes, getBikeById, SpokesSearchResult } from '../../src/api/spokes';
import { useAddBikeMutation, useGearLightQuery, AcquisitionCondition } from '../../src/graphql/generated';
import { SpokesBike, SpokesImage } from '../../src/hooks/useOnboarding';
import { colors } from '../../src/constants/theme';
import { SpokesAttribution } from '../../src/components/common/SpokesAttribution';
import { BikeDetailsStep } from '../../src/components/bike/BikeDetailsStep';
import { WearStartStep } from '../../src/components/bike/WearStartStep';
import { buildSpokesComponentsInput } from '../../src/utils/bikeFormHelpers';
import { isTierError, getTierErrorMessage } from '../../src/utils/tierErrors';
import type { ApolloError } from '@apollo/client';

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

export default function AddBikeScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SpokesSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedBike, setSelectedBike] = useState<SpokesBike | null>(null);
  const [loadingBike, setLoadingBike] = useState(false);
  const [isManualEntry, setIsManualEntry] = useState(false);

  // Manual entry form
  const [manualForm, setManualForm] = useState<ManualForm>(INITIAL_MANUAL_FORM);

  // Details step state
  const [bikeImages, setBikeImages] = useState<SpokesImage[]>([]);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [notes, setNotes] = useState('');

  // Wear start step state
  const [acquisitionCondition, setAcquisitionCondition] = useState<'NEW' | 'USED'>('NEW');

  const [addBike, { loading: adding }] = useAddBikeMutation();
  const { refetch: refetchGear } = useGearLightQuery();

  // --- Search ---

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const bikes = await searchBikes({ query: query.trim() });
      setResults(bikes);
    } catch (error) {
      Alert.alert('Search Failed', (error as Error).message);
    } finally {
      setSearching(false);
    }
  }, [query]);

  const handleSelectBike = useCallback(async (result: SpokesSearchResult) => {
    setLoadingBike(true);
    try {
      const fullBike = await getBikeById(result.id);
      if (fullBike) {
        setSelectedBike(fullBike);

        // Collect images for colorway selection
        const images: SpokesImage[] = [];
        if (fullBike.images && fullBike.images.length > 0) {
          // Deduplicate by URL
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
        Alert.alert('Error', 'Could not load bike details');
      }
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    } finally {
      setLoadingBike(false);
    }
  }, []);

  // --- Manual Entry ---

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
    setAcquisitionCondition('USED'); // Manual bikes default to USED
    setStep('details');
  }, [manualForm]);

  // --- Navigation ---

  const handleBack = useCallback(() => {
    switch (step) {
      case 'confirm':
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
        router.back();
    }
  }, [step, router]);

  const handleDetailsContinue = useCallback(() => {
    setStep('wearStart');
  }, []);

  // --- Submit ---

  const handleConfirm = useCallback(async () => {
    if (!selectedBike) return;

    const isManual = selectedBike.id.startsWith('manual-');

    try {
      await addBike({
        variables: {
          input: {
            manufacturer: selectedBike.maker,
            model: selectedBike.model,
            year: selectedBike.year,
            spokesId: isManual ? undefined : selectedBike.id,
            spokesUrl: selectedBike.url || undefined,
            thumbnailUrl: selectedImageUrl || selectedBike.thumbnailUrl || undefined,
            family: selectedBike.family || undefined,
            category: selectedBike.category || undefined,
            subcategory: selectedBike.subcategory || undefined,
            travelForkMm: selectedBike.travelFork || undefined,
            travelShockMm: selectedBike.travelRear || undefined,
            isEbike: selectedBike.isEbike || false,
            frameMaterial: selectedBike.frameMaterial || undefined,
            batteryWh: selectedBike.batteryWh || undefined,
            motorMaker: selectedBike.motorMaker || undefined,
            motorModel: selectedBike.motorModel || undefined,
            motorPowerW: selectedBike.motorPowerW || undefined,
            motorTorqueNm: selectedBike.motorTorqueNm || undefined,
            nickname: nickname.trim() || undefined,
            notes: notes.trim() || undefined,
            acquisitionCondition: acquisitionCondition as AcquisitionCondition,
            spokesComponents: isManual ? undefined : buildSpokesComponentsInput(selectedBike.components),
          },
        },
      });

      await refetchGear();
      router.back();
    } catch (error) {
      const err = error as ApolloError;
      if (isTierError(err)) {
        Alert.alert('Upgrade Required', getTierErrorMessage(err), [
          { text: 'OK', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.replace('/settings-detail/pricing') },
        ]);
      } else {
        Alert.alert('Failed to Add Bike', err.message);
      }
    }
  }, [selectedBike, selectedImageUrl, nickname, notes, acquisitionCondition, addBike, refetchGear, router]);

  // --- Step: Wear Start ---

  if (step === 'wearStart') {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Component Status',
            headerLeft: () => (
              <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
                <Ionicons name="arrow-back" size={24} color={colors.primary} />
              </TouchableOpacity>
            ),
          }}
        />

        <ScrollView style={styles.flex}>
          <WearStartStep
            selected={acquisitionCondition}
            onSelect={setAcquisitionCondition}
          />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.confirmButton, adding && styles.buttonDisabled]}
            onPress={handleConfirm}
            disabled={adding}
          >
            {adding ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <>
                <Ionicons name="add" size={20} color={colors.textPrimary} />
                <Text style={styles.confirmButtonText}>Add Bike</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- Step: Details (nickname, notes, colorway) ---

  if (step === 'details' && selectedBike) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Bike Details',
            headerLeft: () => (
              <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
                <Ionicons name="arrow-back" size={24} color={colors.primary} />
              </TouchableOpacity>
            ),
          }}
        />

        <BikeDetailsStep
          bike={selectedBike}
          images={bikeImages}
          selectedImageUrl={selectedImageUrl}
          onSelectImage={setSelectedImageUrl}
          nickname={nickname}
          onNicknameChange={setNickname}
          notes={notes}
          onNotesChange={setNotes}
        />

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleDetailsContinue}
          >
            <Text style={styles.confirmButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
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
      <Stack.Screen
        options={{
          title: 'Add Bike',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <Ionicons name="close" size={24} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      {!isManualEntry ? (
        <>
          {/* Search bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search bikes (e.g., Santa Cruz Bronson)"
                placeholderTextColor={colors.textMuted}
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
                autoCapitalize="words"
                autoCorrect={false}
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[styles.searchButton, !query.trim() && styles.buttonDisabled]}
              onPress={handleSearch}
              disabled={!query.trim() || searching}
            >
              {searching ? (
                <ActivityIndicator color={colors.textPrimary} size="small" />
              ) : (
                <Text style={styles.searchButtonText}>Search</Text>
              )}
            </TouchableOpacity>
          </View>

          <SpokesAttribution />

          {/* Results */}
          {results.length > 0 ? (
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.resultItem}
                  onPress={() => handleSelectBike(item)}
                  disabled={loadingBike}
                >
                  <View style={styles.resultContent}>
                    <Text style={styles.resultTitle}>
                      {item.maker} {item.model}
                    </Text>
                    <Text style={styles.resultSubtitle}>
                      {item.year} · {item.category}
                    </Text>
                  </View>
                  {loadingBike ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                  )}
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.resultsList}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
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
          ) : (
            <View style={styles.emptyState}>
              {searching ? (
                <ActivityIndicator size="large" color={colors.primary} />
              ) : (
                <>
                  <Ionicons name="bicycle-outline" size={64} color={colors.textMuted} />
                  <Text style={styles.emptyTitle}>Search for your bike</Text>
                  <Text style={styles.emptySubtitle}>
                    Enter your bike's make and model to find it in our database
                  </Text>
                  <TouchableOpacity
                    style={styles.manualEntryButton}
                    onPress={() => setIsManualEntry(true)}
                  >
                    <Text style={styles.manualEntryText}>
                      Can't find your bike? Enter details manually
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </>
      ) : (
        /* Manual Entry Form */
        <ScrollView style={styles.flex} contentContainerStyle={styles.manualFormContainer}>
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
            style={styles.confirmButton}
            onPress={handleManualContinue}
          >
            <Text style={styles.confirmButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.textPrimary} />
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
  headerButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: colors.textPrimary,
  },
  clearButton: {
    padding: 4,
  },
  searchButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  searchButtonText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  resultsList: {
    paddingTop: 8,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.card,
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  resultSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.cardBorder,
    marginLeft: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  confirmButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },

  // Manual entry
  manualEntryButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  manualEntryText: {
    fontSize: 14,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
  manualFormContainer: {
    padding: 24,
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
