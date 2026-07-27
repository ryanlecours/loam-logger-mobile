import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Href } from 'expo-router';
import { colors, radius, space, type } from '../../constants/theme';

export function EmptyBikeState() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="bicycle-outline" size={48} color={colors.textMuted} />
      </View>
      <Text style={styles.title}>No bikes yet</Text>
      <Text style={styles.subtitle}>
        Add your first bike to start tracking component health and service intervals.
      </Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/bike/add' as Href)}
        accessibilityRole="button"
        accessibilityLabel="Add your first bike"
      >
        <Ionicons name="add" size={20} color={colors.onPrimary} />
        <Text style={styles.buttonText}>Add Bike</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginHorizontal: space.xl,
    marginVertical: space.md,
    padding: space.section,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: space.xl,
  },
  title: {
    ...type.subtitle,
    color: colors.textPrimary,
    marginBottom: space.md,
  },
  subtitle: {
    ...type.footnote,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: space.xxl,
  },
  button: {
    minHeight: 44,
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: space.xxl,
    paddingVertical: space.lg,
    borderRadius: radius.full,
    gap: space.sm,
  },
  buttonText: {
    ...type.calloutStrong,
    color: colors.onPrimary,
  },
});
