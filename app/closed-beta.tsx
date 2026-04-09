import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../src/constants/theme';

export default function ClosedBetaScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🔒</Text>
        </View>

        <Text style={styles.title}>Closed Beta</Text>
        <Text style={styles.subtitle}>
          Loam Logger is currently in closed beta. We're working hard to open up
          to more riders soon!
        </Text>

        <Text style={styles.info}>
          If you've received a beta invite, please use the email address
          associated with your invitation to log in.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace('/(auth)/login')}
        >
          <Text style={styles.buttonText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: colors.primary,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: colors.textSecondary,
    marginBottom: 24,
    lineHeight: 24,
  },
  info: {
    fontSize: 14,
    textAlign: 'center',
    color: colors.textMuted,
    marginBottom: 32,
    lineHeight: 20,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
