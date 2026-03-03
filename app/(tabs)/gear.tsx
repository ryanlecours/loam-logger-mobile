import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { useGearLightQuery } from '../../src/graphql/generated';
import { BikeCard } from '../../src/components/gear/BikeCard';
import { EmptyGearState } from '../../src/components/gear/EmptyGearState';

export default function GearScreen() {
  const router = useRouter();
  const { data, loading, error, refetch } = useGearLightQuery({
    fetchPolicy: 'cache-and-network',
  });

  const handleAddBike = () => {
    router.push('/bike/add' as Href);
  };

  const handleBikePress = (bikeId: string) => {
    router.push(`/bike/${bikeId}` as Href);
  };

  if (loading && !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading your bikes...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={styles.errorTitle}>Failed to load bikes</Text>
        <Text style={styles.errorText}>{error.message}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const bikes = data?.bikes || [];
  const spareComponents = data?.spareComponents || [];

  if (bikes.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyGearState onAddBike={handleAddBike} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={bikes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <BikeCard
            bike={item}
            onPress={() => handleBikePress(item.id)}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#2563eb" />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>My Bikes</Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddBike}>
              <Ionicons name="add" size={24} color="#2563eb" />
            </TouchableOpacity>
          </View>
        }
        ListFooterComponent={
          spareComponents.length > 0 ? (
            <View style={styles.spareSection}>
              <Text style={styles.spareSectionTitle}>Spare Components</Text>
              <Text style={styles.spareCount}>
                {spareComponents.length} component{spareComponents.length !== 1 ? 's' : ''} not installed
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#6b7280',
  },
  errorTitle: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: '600',
    color: '#1f2937',
  },
  errorText: {
    marginTop: 4,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#2563eb',
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  list: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spareSection: {
    marginTop: 16,
    marginHorizontal: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  spareSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  spareCount: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
});
