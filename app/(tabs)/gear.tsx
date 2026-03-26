import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { useGearLightQuery, BikeFieldsLightFragment } from '../../src/graphql/generated';
import { BikeCard } from '../../src/components/gear/BikeCard';
import { EmptyGearState } from '../../src/components/gear/EmptyGearState';
import { colors } from '../../src/constants/theme';

export default function GearScreen() {
  const router = useRouter();
  const [showInactive, setShowInactive] = useState(false);
  const { data, loading, error, refetch } = useGearLightQuery({
    fetchPolicy: 'cache-and-network',
  });

  const handleAddBike = () => {
    router.push('/bike/add' as Href);
  };

  const handleBikePress = (bikeId: string) => {
    router.push(`/bike/${bikeId}` as Href);
  };

  const activeBikes = data?.bikes || [];
  const allBikes = data?.allBikes || [];
  const inactiveBikes = useMemo(
    () => allBikes.filter((b) => b.status === 'RETIRED' || b.status === 'SOLD'),
    [allBikes],
  );
  const spareComponents = data?.spareComponents || [];

  if (loading && !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your bikes...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
        <Text style={styles.errorTitle}>Failed to load bikes</Text>
        <Text style={styles.errorText}>{error.message}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (activeBikes.length === 0 && inactiveBikes.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyGearState onAddBike={handleAddBike} />
      </View>
    );
  }

  const formatStatusDate = (bike: BikeFieldsLightFragment) => {
    const label = bike.status === 'SOLD' ? 'Sold' : 'Retired';
    if (bike.retiredAt) {
      const date = new Date(bike.retiredAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      return `${label} ${date}`;
    }
    return label;
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={activeBikes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <BikeCard
            bike={item}
            onPress={() => handleBikePress(item.id)}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>My Bikes</Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddBike}>
              <Ionicons name="add" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
        }
        ListFooterComponent={
          <>
            {inactiveBikes.length > 0 && (
              <View style={styles.inactiveSection}>
                <TouchableOpacity
                  style={styles.inactiveHeader}
                  onPress={() => setShowInactive((prev) => !prev)}
                  activeOpacity={0.7}
                >
                  <View style={styles.inactiveHeaderLeft}>
                    <Ionicons
                      name={showInactive ? 'chevron-down' : 'chevron-forward'}
                      size={18}
                      color={colors.textMuted}
                    />
                    <Text style={styles.inactiveTitle}>Retired / Sold</Text>
                  </View>
                  <Text style={styles.inactiveCount}>{inactiveBikes.length}</Text>
                </TouchableOpacity>
                {showInactive &&
                  inactiveBikes.map((bike) => (
                    <View key={bike.id} style={styles.inactiveBikeWrapper}>
                      <BikeCard
                        bike={bike}
                        onPress={() => handleBikePress(bike.id)}
                      />
                      <Text style={styles.statusLabel}>{formatStatusDate(bike)}</Text>
                    </View>
                  ))}
              </View>
            )}
            {spareComponents.length > 0 && (
              <View style={styles.spareSection}>
                <Text style={styles.spareSectionTitle}>Spare Components</Text>
                <Text style={styles.spareCount}>
                  {spareComponents.length} component{spareComponents.length !== 1 ? 's' : ''} not installed
                </Text>
              </View>
            )}
          </>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: colors.textSecondary,
  },
  errorTitle: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  errorText: {
    marginTop: 4,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryText: {
    color: colors.textPrimary,
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
    color: colors.textPrimary,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inactiveSection: {
    marginTop: 20,
    marginHorizontal: 16,
  },
  inactiveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  inactiveHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inactiveTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },
  inactiveCount: {
    fontSize: 13,
    color: colors.textMuted,
    backgroundColor: colors.card,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  inactiveBikeWrapper: {
    opacity: 0.7,
  },
  statusLabel: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
    marginRight: 16,
    marginTop: -2,
    marginBottom: 4,
  },
  spareSection: {
    marginTop: 16,
    marginHorizontal: 16,
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  spareSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  spareCount: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
