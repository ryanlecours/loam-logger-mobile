import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { LegalDocument } from '../../src/components/legal/LegalDocument';
import { PRIVACY_SECTIONS } from '../../src/legal/privacy';
import { colors } from '../../src/constants/theme';

export default function PrivacyPolicyScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Privacy Policy' }} />
      <LegalDocument sections={PRIVACY_SECTIONS} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
