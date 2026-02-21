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
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../../src/hooks/useAuth';
import { useOnboarding, type SpokesBike } from '../../src/hooks/useOnboarding';
import { getAccessToken } from '../../src/lib/auth';
import { searchBikes, getBikeById, type SpokesSearchResult } from '../../src/api/spokes';
import { isUnauthorizedError } from '../../src/utils/errors';

type Step = 'search' | 'confirm';

export default function BikeScreen() {
  const { refetchUser, logout } = useAuth();
  const { data: onboardingData, setSelectedBike } = useOnboarding();

  const [step, setStep] = useState<Step>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SpokesSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [loadingBike, setLoadingBike] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Debounced search
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    setSearchError(null);

    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Don't search if query is too short
    if (text.length < 2) {
      setSearchResults([]);
      return;
    }

    // Debounce search
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
      // Fetch full bike details
      const fullBike = await getBikeById(result.id);
      if (fullBike) {
        setSelectedBike(fullBike);
        setStep('confirm');
      } else {
        // If we can't get full details, use search result data
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
        setStep('confirm');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to load bike details');
    } finally {
      setLoadingBike(false);
    }
  }, [setSelectedBike]);

  const handleBack = useCallback(() => {
    setStep('search');
    setSelectedBike(null);
  }, [setSelectedBike]);

  async function handleComplete() {
    const bike = onboardingData.selectedBike;
    if (!bike) {
      Alert.alert('Error', 'Please select a bike');
      return;
    }

    setSubmitting(true);
    try {
      const token = await getAccessToken();
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

      const response = await fetch(`${apiUrl}/onboarding/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          age: onboardingData.age,
          bikeMake: bike.maker,
          bikeModel: bike.model,
          bikeYear: bike.year,
          spokesId: bike.id,
          spokesUrl: bike.spokesUrl,
          thumbnailUrl: bike.thumbnailUrl,
          family: bike.family,
          category: bike.category,
          subcategory: bike.subcategory,
          buildKind: bike.buildKind,
          isFrameset: bike.isFrameset,
          isEbike: bike.isEbike,
          gender: bike.gender,
          frameMaterial: bike.frameMaterial,
          hangerStandard: bike.hangerStandard,
          spokesComponents: bike.components,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to complete onboarding' }));
        throw new Error(error.message || 'Failed to complete onboarding');
      }

      // Refetch user to update onboardingCompleted flag
      await refetchUser();
    } catch (err) {
      // If unauthorized, log out and redirect to login
      if (isUnauthorizedError(err)) {
        await logout();
        return;
      }
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to complete onboarding'
      );
    } finally {
      setSubmitting(false);
    }
  }

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

  // Search step
  if (step === 'search') {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Add Your Bike</Text>
          <Text style={styles.subtitle}>Search for your bike to auto-fill specs</Text>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={handleSearchChange}
              placeholder="Search by make and model..."
              placeholderTextColor="#999"
              autoFocus
              autoCapitalize="words"
              autoCorrect={false}
            />
            {searching && (
              <ActivityIndicator style={styles.searchSpinner} color="#2d5016" />
            )}
          </View>

          {searchError && (
            <Text style={styles.errorText}>{searchError}</Text>
          )}

          {loadingBike && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#2d5016" />
              <Text style={styles.loadingText}>Loading bike details...</Text>
            </View>
          )}

          <FlatList
            data={searchResults}
            renderItem={renderSearchResult}
            keyExtractor={(item) => item.id}
            style={styles.resultsList}
            contentContainerStyle={styles.resultsContent}
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
          />
        </View>
      </KeyboardAvoidingView>
    );
  }

  // Confirm step
  const bike = onboardingData.selectedBike;
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Confirm Your Bike</Text>
        <Text style={styles.subtitle}>We'll use this to track component wear</Text>

        <View style={styles.bikeCard}>
          {bike?.thumbnailUrl && (
            <Image
              source={{ uri: bike.thumbnailUrl }}
              style={styles.bikeImage}
              resizeMode="contain"
            />
          )}
          <Text style={styles.bikeMake}>{bike?.maker}</Text>
          <Text style={styles.bikeModel}>{bike?.model}</Text>
          <Text style={styles.bikeYear}>{bike?.year} • {bike?.category}</Text>
          {bike?.isEbike && (
            <View style={styles.ebikeBadge}>
              <Text style={styles.ebikeBadgeText}>E-Bike</Text>
            </View>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleBack}
            disabled={submitting}
          >
            <Text style={styles.secondaryButtonText}>Change Bike</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, submitting && styles.buttonDisabled]}
            onPress={handleComplete}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Complete Setup</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#2d5016',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  searchSpinner: {
    marginLeft: 8,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  resultsList: {
    flex: 1,
  },
  resultsContent: {
    paddingBottom: 24,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  resultContent: {
    flex: 1,
  },
  resultMake: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  resultModel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  resultYear: {
    fontSize: 14,
    color: '#888',
  },
  resultArrow: {
    fontSize: 24,
    color: '#ccc',
    marginLeft: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    marginTop: 40,
  },
  hintText: {
    textAlign: 'center',
    color: '#888',
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
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  bikeCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#eee',
  },
  bikeImage: {
    width: '100%',
    height: 200,
    marginBottom: 16,
  },
  bikeMake: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  bikeModel: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  bikeYear: {
    fontSize: 16,
    color: '#888',
  },
  ebikeBadge: {
    marginTop: 12,
    backgroundColor: '#2d5016',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ebikeBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  buttonContainer: {
    gap: 12,
    marginTop: 'auto',
    paddingBottom: 40,
  },
  button: {
    backgroundColor: '#2d5016',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2d5016',
  },
  secondaryButtonText: {
    color: '#2d5016',
    fontSize: 16,
    fontWeight: '600',
  },
});
