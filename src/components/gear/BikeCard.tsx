import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BikeFieldsLightFragment } from '../../graphql/generated';
import { ComponentHealthBadge } from './ComponentHealthBadge';
import { BikeThumbnail } from './BikeThumbnail';
import { colors, radius } from '../../constants/theme';

interface BikeCardProps {
  bike: BikeFieldsLightFragment;
  overallStatus?: string;
  onPress: () => void;
}

export function BikeCard({ bike, overallStatus, onPress }: BikeCardProps) {
  const displayName = bike.nickname || `${bike.manufacturer} ${bike.model}`;
  const subtitle = bike.nickname ? `${bike.manufacturer} ${bike.model}` : null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <BikeThumbnail uri={bike.thumbnailUrl} size={80} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
          {overallStatus && <ComponentHealthBadge status={overallStatus} size="small" />}
        </View>
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
        <View style={styles.badges}>
          {bike.year && <Text style={styles.badge}>{bike.year}</Text>}
          {bike.category && <Text style={styles.badge}>{bike.category}</Text>}
          {bike.isEbike && <Text style={styles.badge}>E-Bike</Text>}
        </View>
        <Text style={styles.components}>
          {bike.components?.length || 0} components tracked
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} style={styles.chevron} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 12,
  },
  content: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  badge: {
    fontSize: 11,
    color: colors.textSecondary,
    backgroundColor: colors.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  components: {
    fontSize: 12,
    color: colors.textMuted,
  },
  chevron: {
    alignSelf: 'center',
    marginLeft: 4,
  },
});
