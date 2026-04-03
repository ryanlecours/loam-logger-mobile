import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Dimensions,
  TouchableOpacity,
  type ViewToken,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import type { SpokesImage } from '../../hooks/useOnboarding';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_WIDTH = SCREEN_WIDTH - 48; // 24px padding on each side

interface BikeImageCarouselProps {
  images: SpokesImage[];
  selectedUrl: string | null;
  onSelect: (url: string) => void;
}

export function BikeImageCarousel({ images, selectedUrl, onSelect }: BikeImageCarouselProps) {
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (!selectedUrl) return 0;
    const idx = images.findIndex((img) => img.url === selectedUrl);
    return idx >= 0 ? idx : 0;
  });

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        const idx = viewableItems[0].index;
        setCurrentIndex(idx);
        onSelect(images[idx].url);
      }
    },
    [images, onSelect]
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const scrollToIndex = useCallback(
    (index: number) => {
      const wrappedIndex = ((index % images.length) + images.length) % images.length;
      flatListRef.current?.scrollToIndex({ index: wrappedIndex, animated: true });
    },
    [images.length]
  );

  const currentImage = images[currentIndex];

  return (
    <View style={styles.container}>
      <View style={styles.carouselContainer}>
        <FlatList
          ref={flatListRef}
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, index) => `${item.url}-${index}`}
          renderItem={({ item }) => (
            <View style={[styles.imageContainer, { width: IMAGE_WIDTH }]}>
              <Image
                source={{ uri: item.url }}
                style={styles.image}
                resizeMode="contain"
              />
            </View>
          )}
          getItemLayout={(_, index) => ({
            length: IMAGE_WIDTH,
            offset: IMAGE_WIDTH * index,
            index,
          })}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          initialScrollIndex={currentIndex}
        />

        {images.length > 1 && (
          <>
            <TouchableOpacity
              style={[styles.arrow, styles.arrowLeft]}
              onPress={() => scrollToIndex(currentIndex - 1)}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.arrow, styles.arrowRight]}
              onPress={() => scrollToIndex(currentIndex + 1)}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-forward" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Dot indicators */}
      {images.length > 1 && (
        <View style={styles.dotsContainer}>
          {images.map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => scrollToIndex(index)}
              style={[
                styles.dot,
                index === currentIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>
      )}

      {/* Counter and color name */}
      <View style={styles.infoRow}>
        <Text style={styles.counter}>
          {currentIndex + 1} of {images.length} colorways
        </Text>
        {currentImage?.colorKey && (
          <Text style={styles.colorName}>{currentImage.colorKey}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  carouselContainer: {
    position: 'relative',
    width: IMAGE_WIDTH,
    height: 220,
  },
  imageContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  arrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowLeft: {
    left: 8,
  },
  arrowRight: {
    right: 8,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textMuted,
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  infoRow: {
    alignItems: 'center',
    marginTop: 8,
  },
  counter: {
    fontSize: 13,
    color: colors.textMuted,
  },
  colorName: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
});
