import { Ionicons } from '@expo/vector-icons';

type IconName = keyof typeof Ionicons.glyphMap;

export type WeatherCondition =
  | 'SUNNY'
  | 'CLOUDY'
  | 'RAINY'
  | 'SNOWY'
  | 'WINDY'
  | 'FOGGY'
  | 'UNKNOWN';

export const conditionLabel = (c: WeatherCondition): string => {
  switch (c) {
    case 'SUNNY': return 'Sunny';
    case 'CLOUDY': return 'Cloudy';
    case 'RAINY': return 'Rainy';
    case 'SNOWY': return 'Snowy';
    case 'WINDY': return 'Windy';
    case 'FOGGY': return 'Foggy';
    default: return 'Unknown';
  }
};

export const conditionIcon = (c: WeatherCondition): IconName => {
  switch (c) {
    case 'SUNNY': return 'sunny-outline';
    case 'CLOUDY': return 'cloudy-outline';
    case 'RAINY': return 'rainy-outline';
    case 'SNOWY': return 'snow-outline';
    case 'WINDY': return 'swap-horizontal-outline';
    case 'FOGGY': return 'cloud-outline';
    default: return 'help-circle-outline';
  }
};

export const conditionTint = (c: WeatherCondition): string => {
  switch (c) {
    case 'SUNNY': return '#f4b740';
    case 'CLOUDY': return '#7a8ba3';
    case 'RAINY': return '#4a90e2';
    case 'SNOWY': return '#9ec9e6';
    case 'WINDY': return '#6aa7a0';
    case 'FOGGY': return '#8c9aa6';
    default: return '#888';
  }
};

export const celsiusToFahrenheit = (c: number): number => c * 9 / 5 + 32;

export const mmToInches = (mm: number): number => mm / 25.4;

export const kphToMph = (kph: number): number => kph * 0.621371;
