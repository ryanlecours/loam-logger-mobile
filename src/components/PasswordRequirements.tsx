import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PasswordRequirementsProps {
  password: string;
}

interface Requirement {
  key: string;
  label: string;
  test: (password: string) => boolean;
}

const REQUIREMENTS: Requirement[] = [
  {
    key: 'length',
    label: 'At least 8 characters',
    test: (p) => p.length >= 8,
  },
  {
    key: 'uppercase',
    label: 'At least one uppercase letter (A-Z)',
    test: (p) => /[A-Z]/.test(p),
  },
  {
    key: 'lowercase',
    label: 'At least one lowercase letter (a-z)',
    test: (p) => /[a-z]/.test(p),
  },
  {
    key: 'number',
    label: 'At least one number (0-9)',
    test: (p) => /[0-9]/.test(p),
  },
  {
    key: 'special',
    label: 'At least one special character (!@#$%^&*)',
    test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p),
  },
];

export function checkPasswordRequirements(password: string) {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
  const isValid = Object.values(checks).every(Boolean);
  return { checks, isValid };
}

export function PasswordRequirements({ password }: PasswordRequirementsProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Password Requirements</Text>
      {REQUIREMENTS.map((req) => {
        const isMet = req.test(password);
        return (
          <View key={req.key} style={styles.requirement}>
            <Ionicons
              name={isMet ? 'checkmark-circle' : 'close-circle-outline'}
              size={18}
              color={isMet ? '#22c55e' : '#9ca3af'}
            />
            <Text style={[styles.label, isMet && styles.labelMet]}>
              {req.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  label: {
    fontSize: 13,
    color: '#9ca3af',
  },
  labelMet: {
    color: '#374151',
  },
});
