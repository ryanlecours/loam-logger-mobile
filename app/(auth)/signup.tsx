import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import {
  PasswordRequirements,
  checkPasswordRequirements,
} from '../../src/components/PasswordRequirements';

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const router = useRouter();
  const { setAuthenticated } = useAuth();

  const passwordCheck = useMemo(
    () => checkPasswordRequirements(password),
    [password]
  );

  const canSubmit = useMemo(() => {
    return (
      name.trim().length >= 2 &&
      email.includes('@') &&
      passwordCheck.isValid &&
      password === confirmPassword
    );
  }, [name, email, password, confirmPassword, passwordCheck.isValid]);

  async function handleSignup() {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (name.trim().length < 2) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }

    if (!passwordCheck.isValid) {
      Alert.alert('Error', 'Please meet all password requirements');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/auth/mobile/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name: name.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Signup failed');
      }

      // Check if user was added to waitlist (closed beta)
      if (data.waitlist) {
        setLoading(false);
        setWaitlistSuccess(true);
        return;
      }

      // If not waitlist, tokens should be returned (future: open beta)
      if (data.accessToken) {
        const { storeTokens } = await import('../../src/lib/auth');
        await storeTokens(data.accessToken, data.refreshToken, data.user);
        setAuthenticated(true);
        router.replace('/(tabs)');
      }
    } catch (error) {
      Alert.alert(
        'Signup Failed',
        error instanceof Error ? error.message : 'Please try again'
      );
      setLoading(false);
    }
  }

  // Show waitlist success screen
  if (waitlistSuccess) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>You're on the list!</Text>
          <Text style={styles.waitlistMessage}>
            We've added you to our waitlist. We'll send you an email when your
            account is ready.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.back()}
          >
            <Text style={styles.buttonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join the Loam Logger community</Text>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              editable={!loading}
            />

            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />

            {password.length > 0 && <PasswordRequirements password={password} />}

            <TextInput
              style={[styles.input, { marginTop: password.length > 0 ? 16 : 0 }]}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              editable={!loading}
            />

            {confirmPassword.length > 0 && password !== confirmPassword && (
              <Text style={styles.errorText}>Passwords do not match</Text>
            )}

            <TouchableOpacity
              style={[
                styles.button,
                (!canSubmit || loading) && styles.buttonDisabled,
              ]}
              onPress={handleSignup}
              disabled={!canSubmit || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign Up</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => router.back()}
              disabled={loading}
            >
              <Text style={styles.linkText}>
                Already have an account? Sign in
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
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
  waitlistMessage: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  form: {
    width: '100%',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    marginTop: -8,
    marginBottom: 16,
    marginLeft: 4,
  },
  button: {
    backgroundColor: '#2d5016',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
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
