import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { LegalDocument } from '../../src/components/legal/LegalDocument';
import { TERMS_SECTIONS } from '../../src/legal/terms';
import { colors } from '../../src/constants/theme';

export default function TermsDetailScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Terms & Conditions' }} />
      <LegalDocument sections={TERMS_SECTIONS} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
