import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import { loginWithEmail, loginWithGoogle } from '../../src/lib/auth';
import { useAuth } from '../../src/hooks/useAuth';
import { GoogleSignInButton } from '../../src/components/GoogleSignInButton';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();
  const { setAuthenticated } = useAuth();

  const isLoading = loading || googleLoading;

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    const result = await loginWithEmail(email, password);
    setLoading(false);

    if (result.success) {
      setAuthenticated(true);
      return;
    }

    // Handle special error codes
    if (result.errorCode === 'CLOSED_BETA') {
      router.replace('/closed-beta' as Href);
      return;
    }
    if (result.errorCode === 'ALREADY_ON_WAITLIST') {
      router.replace('/waitlist' as Href);
      return;
    }

    Alert.alert('Login Failed', result.error || 'Please try again');
  }

  async function handleGoogleSuccess(idToken: string) {
    setGoogleLoading(true);
    const result = await loginWithGoogle(idToken);
    setGoogleLoading(false);

    if (result.success) {
      setAuthenticated(true);
      return;
    }

    // Handle special error codes
    if (result.errorCode === 'CLOSED_BETA') {
      router.replace('/closed-beta' as Href);
      return;
    }
    if (result.errorCode === 'ALREADY_ON_WAITLIST') {
      router.replace('/waitlist' as Href);
      return;
    }

    Alert.alert('Login Failed', result.error || 'Please try again');
  }

  function handleGoogleError(error: string) {
    Alert.alert('Google Sign-In Failed', error);
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Loam Logger</Text>
        <Text style={styles.subtitle}>Track your mountain bike rides</Text>

        <View style={styles.form}>
          {/* Google Sign-In */}
          <GoogleSignInButton
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            disabled={isLoading}
          />

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email/Password */}
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!isLoading}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!isLoading}
          />

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.push('/(auth)/signup')}
            disabled={isLoading}
          >
            <Text style={styles.linkText}>
              Don't have an account? Sign up
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#2d5016',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 32,
  },
  form: {
    width: '100%',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#999',
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#2d5016',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkText: {
    color: '#2d5016',
    fontSize: 14,
  },
});
