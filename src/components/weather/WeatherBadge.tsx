import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import {
  conditionIcon,
  conditionTint,
  celsiusToFahrenheit,
  WeatherCondition,
} from '../../lib/weather';

type Weather = {
  tempC: number;
  condition: WeatherCondition;
};

type Props = {
  weather?: Weather | null;
  distanceUnit?: 'mi' | 'km';
  /** Icon/text size. `small` for list rows, `medium` for cards. */
  size?: 'small' | 'medium';
};

/**
 * Compact condition-icon + temperature chip for use in ride list rows and
 * summary cards. Renders nothing when weather is null so consumers can drop
 * it inline without guarding.
 */
export function WeatherBadge({ weather, distanceUnit = 'mi', size = 'small' }: Props) {
  if (!weather) return null;

  const isImperial = distanceUnit === 'mi';
  const temp = isImperial
    ? `${Math.round(celsiusToFahrenheit(weather.tempC))}°`
    : `${Math.round(weather.tempC)}°`;

  const iconSize = size === 'small' ? 14 : 16;
  const textStyle = size === 'small' ? styles.textSmall : styles.textMedium;
  const tint = conditionTint(weather.condition);

  return (
    <View style={styles.container}>
      <Ionicons name={conditionIcon(weather.condition)} size={iconSize} color={tint} />
      <Text style={textStyle}>{temp}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  textSmall: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  textMedium: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
