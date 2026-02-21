import { useRef, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { BikeFieldsFragment } from '../../graphql/generated';
import { BikeHealthCard } from './BikeHealthCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32; // 16px margin on each side
const CARD_MARGIN = 8;

interface BikeCarouselProps {
  bikes: BikeFieldsFragment[];
  onBikePress: (bikeId: string) => void;
}

export function BikeCarousel({ bikes, onBikePress }: BikeCarouselProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (CARD_WIDTH + CARD_MARGIN * 2));
    if (index !== activeIndex && index >= 0 && index < bikes.length) {
      setActiveIndex(index);
    }
  };

  if (bikes.length === 1) {
    // Single bike - use regular card without carousel
    return (
      <BikeHealthCard
        bike={bikes[0]}
        onPress={() => onBikePress(bikes[0].id)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + CARD_MARGIN * 2}
        snapToAlignment="start"
        contentContainerStyle={styles.scrollContent}
      >
        {bikes.map((bike) => (
          <View key={bike.id} style={styles.cardWrapper}>
            <BikeHealthCard
              bike={bike}
              onPress={() => onBikePress(bike.id)}
              compact
            />
          </View>
        ))}
      </ScrollView>

      {/* Page indicators */}
      <View style={styles.indicators}>
        {bikes.map((bike, index) => (
          <View
            key={bike.id}
            style={[
              styles.indicator,
              index === activeIndex && styles.indicatorActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  scrollContent: {
    paddingHorizontal: 8,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    marginHorizontal: CARD_MARGIN,
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d1d5db',
  },
  indicatorActive: {
    backgroundColor: '#2563eb',
    width: 24,
  },
});
