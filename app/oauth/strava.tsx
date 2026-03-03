import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

export default function StravaOAuthCallback() {
  const { status, reason } = useLocalSearchParams<{ status?: string; reason?: string }>();
  const router = useRouter();

  useEffect(() => {
    WebBrowser.dismissBrowser();

    const timer = setTimeout(() => {
      router.replace('/(tabs)/settings');
    }, 300);

    return () => clearTimeout(timer);
  }, [status, reason, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#fc4c02" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
