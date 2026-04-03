import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../src/constants/theme';

export default function BillingCancelledScreen() {
  const router = useRouter();

  useEffect(() => {
    setTimeout(() => {
      router.replace('/(tabs)/settings' as Href);
    }, 1500);
  }, [router]);

  return (
    <View style={styles.container}>
      <Ionicons name="close-circle-outline" size={64} color={colors.textMuted} />
      <Text style={styles.title}>Checkout Cancelled</Text>
      <Text style={styles.subtitle}>No changes were made to your account.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 8,
  },
});
