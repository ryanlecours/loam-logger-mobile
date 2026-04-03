import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { useMeQuery } from '../src/graphql/generated';
import { colors } from '../src/constants/theme';

export default function BillingReturnScreen() {
  const router = useRouter();
  const { refetch } = useMeQuery({ fetchPolicy: 'cache-first' });

  useEffect(() => {
    async function handleReturn() {
      // Refetch in case subscription status changed in the portal
      await refetch();
      router.replace('/(tabs)/settings' as Href);
    }
    handleReturn();
  }, [refetch, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
