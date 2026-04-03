import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Href } from 'expo-router';
import { colors } from '../../constants/theme';

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
      >
        <Ionicons name="add" size={20} color={colors.textPrimary} />
        <Text style={styles.buttonText}>Add Bike</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 32,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
});
