import { View, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import RevenueCatUI from 'react-native-purchases-ui';
import { useMeQuery } from '../../src/graphql/generated';
import { colors } from '../../src/constants/theme';

export default function CustomerCenterScreen() {
  const router = useRouter();
  const { refetch } = useMeQuery({ fetchPolicy: 'cache-first' });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Manage Subscription' }} />
      <RevenueCatUI.CustomerCenterView
        style={styles.customerCenter}
        onDismiss={() => {
          refetch();
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)/settings');
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  customerCenter: {
    flex: 1,
  },
});
