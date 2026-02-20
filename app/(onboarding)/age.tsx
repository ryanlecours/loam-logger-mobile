import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboarding } from '../../src/hooks/useOnboarding';

const MIN_AGE = 16;
const MAX_AGE = 120;

export default function AgeScreen() {
  const router = useRouter();
  const { setAge } = useOnboarding();
  const [ageInput, setAgeInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  function validateAndContinue() {
    setError(null);

    const age = parseInt(ageInput, 10);

    if (!ageInput || isNaN(age)) {
      setError('Please enter your age');
      return;
    }

    if (age < MIN_AGE) {
      setError(`You must be at least ${MIN_AGE} years old to use Loam Logger`);
      return;
    }

    if (age > MAX_AGE) {
      setError('Please enter a valid age');
      return;
    }

    // Store age in onboarding context and navigate
    setAge(age);
    router.push('/(onboarding)/bike');
  }

  function handleAgeChange(text: string) {
    // Only allow numeric input
    const numericText = text.replace(/[^0-9]/g, '');
    setAgeInput(numericText);
    // Clear error when user types
    if (error) setError(null);
  }

  const isValid = ageInput.length > 0 && parseInt(ageInput, 10) >= MIN_AGE;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>How old are you?</Text>
        <Text style={styles.subtitle}>
          You must be at least {MIN_AGE} to use Loam Logger
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, error && styles.inputError]}
            value={ageInput}
            onChangeText={handleAgeChange}
            placeholder="Enter your age"
            placeholderTextColor="#999"
            keyboardType="number-pad"
            maxLength={3}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={validateAndContinue}
          />
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>

        <TouchableOpacity
          style={[styles.button, !isValid && styles.buttonDisabled]}
          onPress={validateAndContinue}
          disabled={!isValid}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    fontSize: 24,
    textAlign: 'center',
    color: '#333',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: '#dc2626',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  button: {
    backgroundColor: '#2d5016',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
