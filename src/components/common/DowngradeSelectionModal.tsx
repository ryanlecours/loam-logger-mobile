import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { gql, useMutation } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useGearLightQuery, useMeQuery } from '../../graphql/generated';
import { colors } from '../../constants/theme';

const SELECT_BIKE = gql`
  mutation SelectBikeForDowngrade($bikeId: ID!) {
    selectBikeForDowngrade(bikeId: $bikeId) {
      id
    }
  }
`;

export function DowngradeSelectionModal() {
  const { data: gearData, loading: gearLoading } = useGearLightQuery({
    fetchPolicy: 'network-only',
  });
  const { refetch: refetchMe } = useMeQuery({ fetchPolicy: 'cache-first' });
  const [selectBike, { loading: selecting }] = useMutation(SELECT_BIKE);
  const [selectedBikeId, setSelectedBikeId] = useState<string | null>(null);

  const activeBikes = gearData?.bikes ?? [];

  const handleConfirm = async () => {
    if (!selectedBikeId) return;
    try {
      await selectBike({ variables: { bikeId: selectedBikeId } });
      await refetchMe();
    } catch {
      Alert.alert('Error', 'Failed to save selection. Please try again.');
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Ionicons name="alert-circle-outline" size={32} color={colors.monitor} style={styles.icon} />
          <Text style={styles.title}>Your plan has changed</Text>
          <Text style={styles.subtitle}>
            Your Free plan allows 1 bike. Choose which bike to keep — the others will be archived and can be restored if you upgrade.
          </Text>

          {gearLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
          ) : (
            <ScrollView style={styles.bikeList} showsVerticalScrollIndicator={false}>
              {activeBikes.map((bike) => {
                const isSelected = selectedBikeId === bike.id;
                const bikeName = bike.nickname || `${bike.manufacturer} ${bike.model}`;
                return (
                  <TouchableOpacity
                    key={bike.id}
                    style={[styles.bikeRow, isSelected && styles.bikeRowSelected]}
                    onPress={() => setSelectedBikeId(bike.id)}
                    disabled={selecting}
                  >
                    {bike.thumbnailUrl ? (
                      <Image source={{ uri: bike.thumbnailUrl }} style={styles.thumbnail} />
                    ) : (
                      <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
                        <Ionicons name="bicycle" size={20} color={colors.textMuted} />
                      </View>
                    )}
                    <View style={styles.bikeInfo}>
                      <Text style={styles.bikeName} numberOfLines={1}>{bikeName}</Text>
                      <Text style={styles.bikeYear}>{bike.year}</Text>
                    </View>
                    <View style={[styles.radio, isSelected && styles.radioSelected]}>
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <TouchableOpacity
            style={[styles.confirmButton, (!selectedBikeId || selecting) && styles.buttonDisabled]}
            onPress={handleConfirm}
            disabled={!selectedBikeId || selecting}
          >
            {selecting ? (
              <ActivityIndicator size="small" color={colors.textPrimary} />
            ) : (
              <Text style={styles.confirmText}>Keep This Bike</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  icon: {
    alignSelf: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  loader: {
    marginVertical: 32,
  },
  bikeList: {
    maxHeight: 300,
    marginBottom: 20,
  },
  bikeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 8,
  },
  bikeRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 12,
  },
  thumbnailPlaceholder: {
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bikeInfo: {
    flex: 1,
  },
  bikeName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  bikeYear: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
