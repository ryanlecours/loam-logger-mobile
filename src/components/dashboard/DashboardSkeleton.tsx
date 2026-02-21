import { View, StyleSheet } from 'react-native';

export function DashboardSkeleton() {
  return (
    <View style={styles.container}>
      {/* Greeting skeleton */}
      <View style={styles.greetingContainer}>
        <View style={[styles.skeleton, styles.greetingLine]} />
        <View style={[styles.skeleton, styles.subtitleLine]} />
      </View>

      {/* Bike card skeleton */}
      <View style={styles.cardContainer}>
        <View style={[styles.skeleton, styles.imageArea]} />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={[styles.skeleton, styles.nameLine]} />
            <View style={[styles.skeleton, styles.badge]} />
          </View>
          <View style={[styles.skeleton, styles.statusLine]} />
          <View style={[styles.skeleton, styles.footerLine]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  greetingContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  cardContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  skeleton: {
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
  },
  greetingLine: {
    width: '60%',
    height: 28,
  },
  subtitleLine: {
    width: '40%',
    height: 16,
    marginTop: 8,
  },
  imageArea: {
    height: 140,
    borderRadius: 0,
  },
  nameLine: {
    width: '50%',
    height: 20,
  },
  badge: {
    width: 60,
    height: 24,
    borderRadius: 12,
  },
  statusLine: {
    width: '70%',
    height: 14,
    marginBottom: 12,
  },
  footerLine: {
    width: '30%',
    height: 14,
  },
});
