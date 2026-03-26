import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BikeFieldsFragment } from '../../graphql/generated';
import { colors } from '../../constants/theme';

interface BikeSelectorSheetProps {
  visible: boolean;
  bikes: BikeFieldsFragment[];
  selectedBikeId: string | null;
  onSelect: (bikeId: string) => void;
  onAddBike: () => void;
  onClose: () => void;
}

export function BikeSelectorSheet({
  visible,
  bikes,
  selectedBikeId,
  onSelect,
  onAddBike,
  onClose,
}: BikeSelectorSheetProps) {
  const getBikeStats = (bike: BikeFieldsFragment) => {
    const components = bike.components || [];
    const totalHours = components.reduce((sum, c) => sum + (c.hoursUsed || 0), 0);
    return {
      hours: totalHours,
      parts: components.length,
    };
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="bicycle" size={20} color={colors.primary} />
              <Text style={styles.headerTitle}>Your Bikes</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.bikeList} bounces={false}>
            {bikes.map((bike) => {
              const stats = getBikeStats(bike);
              const isSelected = bike.id === selectedBikeId;
              const displayName = bike.nickname || `${bike.manufacturer} ${bike.model}`;

              return (
                <TouchableOpacity
                  key={bike.id}
                  style={[styles.bikeRow, isSelected && styles.bikeRowSelected]}
                  onPress={() => {
                    onSelect(bike.id);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.bikeInfo}>
                    {bike.thumbnailUrl ? (
                      <Image source={{ uri: bike.thumbnailUrl }} style={styles.bikeImage} resizeMode="cover" />
                    ) : (
                      <View style={styles.bikePlaceholder}>
                        <Ionicons name="bicycle" size={24} color={colors.textMuted} />
                      </View>
                    )}
                    <View style={styles.bikeDetails}>
                      <Text style={styles.bikeName}>{displayName}</Text>
                      <Text style={styles.bikeStats}>
                        {stats.hours.toFixed(0)}h  ·  {stats.parts} parts
                      </Text>
                    </View>
                  </View>
                  {isSelected && (
                    <View style={styles.activeDot} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity style={styles.addBikeButton} onPress={onAddBike} activeOpacity={0.7}>
            <Ionicons name="add" size={20} color={colors.textSecondary} />
            <Text style={styles.addBikeText}>Add Bike</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  bikeList: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  bikeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
    marginBottom: 10,
  },
  bikeRowSelected: {
    borderColor: colors.primary,
  },
  bikeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bikeImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  bikePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bikeDetails: {
    marginLeft: 12,
    flex: 1,
  },
  bikeName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  bikeStats: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginLeft: 12,
  },
  addBikeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderStyle: 'dashed',
    gap: 8,
  },
  addBikeText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
  },
});
