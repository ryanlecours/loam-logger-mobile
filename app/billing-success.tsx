import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMeQuery } from '../src/graphql/generated';
import { colors } from '../src/constants/theme';

export default function BillingSuccessScreen() {
  const router = useRouter();
  const { refetch } = useMeQuery({ fetchPolicy: 'cache-first' });

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    async function handleSuccess() {
      // Refetch user data to pick up the new tier
      await refetch();
      // Brief delay so the user sees the success message
      timeoutId = setTimeout(() => {
        router.replace('/(tabs)/settings' as Href);
      }, 1500);
    }
    handleSuccess();
    return () => clearTimeout(timeoutId);
  }, [refetch, router]);

  return (
    <View style={styles.container}>
      <Ionicons name="checkmark-circle" size={64} color={colors.good} />
      <Text style={styles.title}>Welcome to Pro!</Text>
      <Text style={styles.subtitle}>Your upgrade was successful.</Text>
      <ActivityIndicator color={colors.primary} style={styles.spinner} />
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
  spinner: {
    marginTop: 24,
  },
});
