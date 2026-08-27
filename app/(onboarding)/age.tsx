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
import { colors, radius } from '../../src/constants/theme';
import { KeyboardDoneAccessory } from '../../src/components/common/KeyboardDoneAccessory';
import { Screen } from '../../src/components/common/Screen';

/** Unique per surface: other screens stay mounted underneath and would collide on a shared id. */
const DONE_ACCESSORY = 'onboarding-age-done';

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
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <Text style={styles.title}>How old are you?</Text>
          <Text style={styles.subtitle}>
            You must be at least {MIN_AGE} to use Loam Logger
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              inputAccessoryViewID={DONE_ACCESSORY}
              style={[styles.input, error && styles.inputError]}
              value={ageInput}
              onChangeText={handleAgeChange}
              placeholder="Enter your age"
              placeholderTextColor={colors.textMuted}
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

        <KeyboardDoneAccessory nativeID={DONE_ACCESSORY} />
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
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
    color: colors.primary,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: colors.textSecondary,
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 16,
    fontSize: 24,
    textAlign: 'center',
    color: colors.textPrimary,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: colors.criticalBorder,
  },
  errorText: {
    color: colors.criticalOn,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
