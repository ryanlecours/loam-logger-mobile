import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { searchBikes, getBikeById, SpokesSearchResult } from '../../src/api/spokes';
import { useAddBikeMutation, useGearLightQuery, AcquisitionCondition } from '../../src/graphql/generated';
import { SpokesBike } from '../../src/hooks/useOnboarding';
import { colors } from '../../src/constants/theme';

type Step = 'search' | 'confirm';

export default function AddBikeScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SpokesSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedBike, setSelectedBike] = useState<SpokesBike | null>(null);
  const [loadingBike, setLoadingBike] = useState(false);

  const [addBike, { loading: adding }] = useAddBikeMutation();
  const { refetch: refetchGear } = useGearLightQuery();

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
        setStep('confirm');
      } else {
        Alert.alert('Error', 'Could not load bike details');
      }
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    } finally {
      setLoadingBike(false);
    }
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!selectedBike) return;

    try {
      await addBike({
        variables: {
          input: {
            manufacturer: selectedBike.maker,
            model: selectedBike.model,
            year: selectedBike.year,
            spokesId: selectedBike.id,
            spokesUrl: selectedBike.url || undefined,
            thumbnailUrl: selectedBike.thumbnailUrl || undefined,
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
            acquisitionCondition: AcquisitionCondition.New,
          },
        },
      });

      // Refetch the gear list
      await refetchGear();

      // Navigate back to gear tab
      router.back();
    } catch (error) {
      Alert.alert('Failed to Add Bike', (error as Error).message);
    }
  }, [selectedBike, addBike, refetchGear, router]);

  const handleBack = useCallback(() => {
    if (step === 'confirm') {
      setStep('search');
      setSelectedBike(null);
    } else {
      router.back();
    }
  }, [step, router]);

  const renderSearchResult = ({ item }: { item: SpokesSearchResult }) => (
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
  );

  if (step === 'confirm' && selectedBike) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Confirm Bike',
            headerLeft: () => (
              <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
                <Ionicons name="arrow-back" size={24} color={colors.primary} />
              </TouchableOpacity>
            ),
          }}
        />

        <View style={styles.confirmContent}>
          {selectedBike.thumbnailUrl ? (
            <Image
              source={{ uri: selectedBike.thumbnailUrl }}
              style={styles.bikeImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="bicycle" size={80} color={colors.textMuted} />
            </View>
          )}

          <Text style={styles.bikeName}>
            {selectedBike.maker} {selectedBike.model}
          </Text>
          <Text style={styles.bikeYear}>{selectedBike.year}</Text>

          <View style={styles.specsList}>
            {selectedBike.category && (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Category</Text>
                <Text style={styles.specValue}>{selectedBike.category}</Text>
              </View>
            )}
            {selectedBike.travelFork && (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Fork Travel</Text>
                <Text style={styles.specValue}>{selectedBike.travelFork}mm</Text>
              </View>
            )}
            {selectedBike.travelRear && (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Rear Travel</Text>
                <Text style={styles.specValue}>{selectedBike.travelRear}mm</Text>
              </View>
            )}
            {selectedBike.frameMaterial && (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Frame</Text>
                <Text style={styles.specValue}>{selectedBike.frameMaterial}</Text>
              </View>
            )}
            {selectedBike.isEbike && (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>E-Bike</Text>
                <Text style={styles.specValue}>Yes</Text>
              </View>
            )}
          </View>
        </View>

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
                <Text style={styles.confirmButtonText}>Add This Bike</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen
        options={{
          title: 'Add Bike',
          headerLeft: () => (
            <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
              <Ionicons name="close" size={24} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

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

      {results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderSearchResult}
          contentContainerStyle={styles.resultsList}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
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
            </>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  confirmContent: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
  },
  bikeImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bikeName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 20,
    textAlign: 'center',
  },
  bikeYear: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 4,
  },
  specsList: {
    width: '100%',
    marginTop: 24,
    backgroundColor: colors.card,
    borderRadius: 12,
    overflow: 'hidden',
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  specLabel: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  specValue: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
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
});
