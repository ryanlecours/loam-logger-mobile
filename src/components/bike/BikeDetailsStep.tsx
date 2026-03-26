import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { BikeImageCarousel } from './BikeImageCarousel';
import type { SpokesBike, SpokesImage } from '../../hooks/useOnboarding';

interface BikeDetailsStepProps {
  bike: SpokesBike;
  images: SpokesImage[];
  selectedImageUrl: string | null;
  onSelectImage: (url: string) => void;
  nickname: string;
  onNicknameChange: (text: string) => void;
  notes: string;
  onNotesChange: (text: string) => void;
}

export function BikeDetailsStep({
  bike,
  images,
  selectedImageUrl,
  onSelectImage,
  nickname,
  onNicknameChange,
  notes,
  onNotesChange,
}: BikeDetailsStepProps) {
  const hasMultipleImages = images.length > 1;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Bike summary */}
        <View style={styles.bikeSummary}>
          {hasMultipleImages ? (
            <BikeImageCarousel
              images={images}
              selectedUrl={selectedImageUrl}
              onSelect={onSelectImage}
            />
          ) : (
            bike.thumbnailUrl ? (
              <Image
                source={{ uri: selectedImageUrl || bike.thumbnailUrl }}
                style={styles.bikeImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="bicycle" size={60} color={colors.textMuted} />
              </View>
            )
          )}
          <Text style={styles.bikeName}>
            {bike.maker} {bike.model}
          </Text>
          <Text style={styles.bikeYear}>{bike.year}</Text>
        </View>

        {/* Nickname */}
        <View style={styles.field}>
          <Text style={styles.label}>Nickname</Text>
          <TextInput
            style={styles.input}
            value={nickname}
            onChangeText={onNicknameChange}
            placeholder="Lunch laps rig"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
            autoCorrect={false}
          />
        </View>

        {/* Notes */}
        <View style={styles.field}>
          <Text style={styles.label}>Bike Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={onNotesChange}
            placeholder="Setup notes, service reminders..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 100,
  },
  bikeSummary: {
    alignItems: 'center',
    marginBottom: 24,
  },
  bikeImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bikeName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 16,
    textAlign: 'center',
  },
  bikeYear: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 4,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
});
