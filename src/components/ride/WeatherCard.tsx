import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import {
  WeatherCondition,
  conditionIcon,
  conditionLabel,
  conditionTint,
  celsiusToFahrenheit,
  mmToInches,
  kphToMph,
} from '../../lib/weather';

type Props = {
  weather: {
    tempC: number;
    feelsLikeC?: number | null;
    precipitationMm: number;
    windSpeedKph: number;
    humidity?: number | null;
    condition: WeatherCondition;
  };
  distanceUnit?: 'mi' | 'km';
};

export function WeatherCard({ weather, distanceUnit = 'mi' }: Props) {
  const isImperial = distanceUnit === 'mi';
  const tempValue = isImperial
    ? `${Math.round(celsiusToFahrenheit(weather.tempC))}°F`
    : `${Math.round(weather.tempC)}°C`;
  const precipValue = isImperial
    ? `${mmToInches(weather.precipitationMm).toFixed(2)} in`
    : `${weather.precipitationMm.toFixed(1)} mm`;
  const windValue = isImperial
    ? `${Math.round(kphToMph(weather.windSpeedKph))} mph`
    : `${Math.round(weather.windSpeedKph)} kph`;

  const tint = conditionTint(weather.condition);

  const feelsLikeValue =
    weather.feelsLikeC != null
      ? isImperial
        ? `${Math.round(celsiusToFahrenheit(weather.feelsLikeC))}°F`
        : `${Math.round(weather.feelsLikeC)}°C`
      : null;
  const humidityValue =
    weather.humidity != null ? `${Math.round(weather.humidity)}%` : null;

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Weather</Text>
      <View style={styles.grid}>
        <View style={styles.item}>
          <Ionicons name={conditionIcon(weather.condition)} size={24} color={tint} />
          <Text style={styles.value}>{conditionLabel(weather.condition)}</Text>
          <Text style={styles.label}>Condition</Text>
        </View>
        <View style={styles.item}>
          <Ionicons name="thermometer-outline" size={24} color={colors.textMuted} />
          <Text style={styles.value}>{tempValue}</Text>
          <Text style={styles.label}>Temp</Text>
        </View>
        <View style={styles.item}>
          <Ionicons name="water-outline" size={24} color={colors.textMuted} />
          <Text style={styles.value}>{precipValue}</Text>
          <Text style={styles.label}>Precip</Text>
        </View>
        <View style={styles.item}>
          <Ionicons name="speedometer-outline" size={24} color={colors.textMuted} />
          <Text style={styles.value}>{windValue}</Text>
          <Text style={styles.label}>Wind</Text>
        </View>
      </View>
      {(feelsLikeValue || humidityValue) && (
        <View style={styles.secondaryRow}>
          {feelsLikeValue && <Text style={styles.secondaryText}>Feels like {feelsLikeValue}</Text>}
          {humidityValue && <Text style={styles.secondaryText}>Humidity {humidityValue}</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  item: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 6,
  },
  label: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  secondaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 8,
  },
  secondaryText: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
