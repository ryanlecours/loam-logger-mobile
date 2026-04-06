import { View, Text, ScrollView, StyleSheet } from 'react-native';
import type { LegalSection } from '../../legal/terms';
import { colors } from '../../constants/theme';

type Props = {
  sections: LegalSection[];
  onScrollEnd?: () => void;
};

export function LegalDocument({ sections, onScrollEnd }: Props) {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      onScroll={
        onScrollEnd
          ? ({ nativeEvent }) => {
              const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
              const isAtBottom =
                layoutMeasurement.height + contentOffset.y >= contentSize.height - 40;
              if (isAtBottom) onScrollEnd();
            }
          : undefined
      }
      scrollEventThrottle={onScrollEnd ? 200 : undefined}
    >
      {sections.map((section, i) => (
        <View key={i} style={i > 0 ? styles.section : undefined}>
          <Text style={i === 0 ? styles.documentTitle : styles.sectionTitle}>
            {section.title}
          </Text>
          <Text style={styles.body}>{section.body}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 8,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginTop: 20,
  },
  documentTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
  },
});
