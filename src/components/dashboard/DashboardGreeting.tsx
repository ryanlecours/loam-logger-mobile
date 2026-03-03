import { View, Text, StyleSheet } from 'react-native';
import {
  getTimeOfDayGreeting,
  getRandomDefaultMessage,
  getBikeHealthInsight,
} from '../../utils/greetingMessages';

interface DashboardGreetingProps {
  firstName: string;
  dueNowCount?: number;
  dueSoonCount?: number;
}

export function DashboardGreeting({
  firstName,
  dueNowCount = 0,
  dueSoonCount = 0,
}: DashboardGreetingProps) {
  const greeting = getTimeOfDayGreeting();
  const insight = getBikeHealthInsight(dueNowCount, dueSoonCount);
  const subtitle = insight
    ? `${insight.emoji} ${insight.message}`
    : getRandomDefaultMessage();

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>
        {greeting}, {firstName}!
      </Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    marginTop: 4,
  },
});
