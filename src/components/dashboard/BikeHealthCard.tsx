import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BikeFieldsFragment } from '../../graphql/generated';
import { ComponentHealthBadge } from '../gear/ComponentHealthBadge';
import { colors } from '../../constants/theme';

interface BikeHealthCardProps {
  bike: BikeFieldsFragment;
  onPress: () => void;
  /** When true, removes horizontal margins (for use in carousel) */
  compact?: boolean;
}

export function BikeHealthCard({ bike, onPress, compact }: BikeHealthCardProps) {
  const displayName = bike.nickname || `${bike.manufacturer} ${bike.model}`;
  const subtitle = bike.nickname ? `${bike.manufacturer} ${bike.model}` : null;
  const predictions = bike.predictions;

  const overallStatus = predictions?.overallStatus || 'UNKNOWN';
  const dueNowCount = predictions?.dueNowCount || 0;
  const dueSoonCount = predictions?.dueSoonCount || 0;

  const getStatusText = () => {
    if (dueNowCount > 0 && dueSoonCount > 0) {
      return `${dueNowCount} due now, ${dueSoonCount} due soon`;
    }
    if (dueNowCount > 0) {
      return `${dueNowCount} component${dueNowCount > 1 ? 's' : ''} due now`;
    }
    if (dueSoonCount > 0) {
      return `${dueSoonCount} component${dueSoonCount > 1 ? 's' : ''} due soon`;
    }
    return 'All components in good shape';
  };

  return (
    <TouchableOpacity
      style={[styles.card, compact && styles.cardCompact]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.imageContainer}>
        {bike.thumbnailUrl ? (
          <Image
            source={{ uri: bike.thumbnailUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="bicycle" size={48} color={colors.textMuted} />
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.nameContainer}>
            <Text style={styles.name} numberOfLines={1}>
              {displayName}
            </Text>
            {subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
          <ComponentHealthBadge status={overallStatus} />
        </View>

        <Text style={styles.statusText}>{getStatusText()}</Text>

        <View style={styles.footer}>
          <Text style={styles.viewDetails}>View Details</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  cardCompact: {
    marginHorizontal: 0,
    marginVertical: 0,
  },
  imageContainer: {
    height: 140,
    backgroundColor: colors.background,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  nameContainer: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewDetails: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginRight: 4,
  },
});
