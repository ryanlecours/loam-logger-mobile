import { useEffect, useRef, useState } from 'react';
import { Animated, AccessibilityInfo, StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, radius as radiusTokens } from '../../constants/theme';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  /** Defaults to the pill, which is what a text-line placeholder should be. */
  radius?: number;
  style?: ViewStyle | ViewStyle[];
}

/**
 * One shimmering placeholder block, shared by every loading state.
 *
 * There were three separate skeleton implementations (this screen's, the
 * recent-rides rows, and the AI summary), each with its own colour and corner
 * treatment and none of them animated. One component means a loading screen
 * reads as one thing.
 *
 * The shimmer is an opacity pulse rather than a travelling gradient because
 * this app ships no gradient or reanimated dependency, and adding one to
 * animate a placeholder is not a trade worth making. It runs on the native
 * driver, so it does not compete with the JS thread that is busy parsing the
 * response the skeleton is waiting for.
 *
 * Reduce Motion is honoured: the block then sits at a steady mid opacity
 * instead of pulsing, which still reads as "not real content yet".
 */
export function Skeleton({ width, height = 14, radius, style }: SkeletonProps) {
  const pulse = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (!cancelled) setReduceMotion(enabled);
      })
      .catch(() => {
        // Older platforms can reject; a pulsing block is the safe default.
      });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      pulse.stopAnimation();
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reduceMotion]);

  return (
    <Animated.View
      style={[
        styles.block,
        {
          width,
          height,
          borderRadius: radius ?? radiusTokens.full,
          opacity: reduceMotion ? 0.6 : pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] }),
        },
        style as ViewStyle,
      ]}
    />
  );
}

/**
 * Wrapper for a screen or block of skeletons. Announces one "loading" state
 * rather than letting a screen reader walk a dozen meaningless placeholders.
 */
export function SkeletonGroup({
  label,
  children,
  style,
}: {
  label: string;
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
}) {
  return (
    <View
      style={style}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
    >
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.skeleton,
  },
});
