import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { useGearQuery, ComponentFieldsFragment } from '../../src/graphql/generated';
import { ComponentHealthBadge } from '../../src/components/gear/ComponentHealthBadge';
import { ComponentRow } from '../../src/components/gear/ComponentRow';
import { LogServiceSheet } from '../../src/components/gear/LogServiceSheet';
import { ComponentDetailSheet } from '../../src/components/gear/ComponentDetailSheet';
import { ReplaceComponentSheet } from '../../src/components/gear/ReplaceComponentSheet';

export default function BikeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [showLogService, setShowLogService] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<ComponentFieldsFragment | null>(null);
  const [showReplaceSheet, setShowReplaceSheet] = useState(false);
  const { data, loading, error, refetch } = useGearQuery({
    fetchPolicy: 'cache-and-network',
  });

  const bike = data?.bikes?.find((b) => b.id === id);
  const predictions = bike?.predictions;

  if (loading && !data) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Loading...' }} />
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error || !bike) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Error' }} />
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={styles.errorTitle}>
          {error ? 'Failed to load bike' : 'Bike not found'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
          <Text style={styles.retryText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const displayName = bike.nickname || `${bike.manufacturer} ${bike.model}`;
  const subtitle = bike.nickname ? `${bike.manufacturer} ${bike.model}` : null;

  // Build component list with prediction data
  const componentPredictions = predictions?.components || [];
  const predictionMap = new Map(
    componentPredictions.map((p) => [p.componentId, p])
  );

  // Sort components by urgency (due now/overdue first)
  const sortedComponents = [...(bike.components || [])].sort((a, b) => {
    const predA = predictionMap.get(a.id);
    const predB = predictionMap.get(b.id);
    const statusOrder: Record<string, number> = {
      OVERDUE: 0,
      DUE_NOW: 1,
      DUE_SOON: 2,
      ALL_GOOD: 3,
      UNKNOWN: 4,
    };
    const orderA = statusOrder[predA?.status || a.status || 'UNKNOWN'] ?? 4;
    const orderB = statusOrder[predB?.status || b.status || 'UNKNOWN'] ?? 4;
    return orderA - orderB;
  });

  const handleComponentPress = (component: ComponentFieldsFragment) => {
    setSelectedComponent(component);
  };

  const handleLogServiceFromDetail = () => {
    // Close detail sheet and open log service with the component pre-selected
    const componentId = selectedComponent?.id;
    setSelectedComponent(null);
    setTimeout(() => {
      setShowLogService(true);
    }, 300);
  };

  const handleReplaceFromDetail = () => {
    // Keep the selected component and open replace sheet
    setShowReplaceSheet(true);
  };

  const handleReplaceComplete = () => {
    setShowReplaceSheet(false);
    setSelectedComponent(null);
    refetch();
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#2563eb" />
      }
    >
      <Stack.Screen
        options={{
          title: displayName,
          headerBackTitle: 'Gear',
        }}
      />

      {/* Hero Section */}
      <View style={styles.hero}>
        {bike.thumbnailUrl ? (
          <Image source={{ uri: bike.thumbnailUrl }} style={styles.heroImage} resizeMode="cover" />
        ) : (
          <View style={styles.heroPlaceholder}>
            <Ionicons name="bicycle" size={80} color="#9ca3af" />
          </View>
        )}
        <View style={styles.heroOverlay}>
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>{displayName}</Text>
            {subtitle && <Text style={styles.heroSubtitle}>{subtitle}</Text>}
            {predictions?.overallStatus && (
              <View style={styles.heroStatusRow}>
                <ComponentHealthBadge status={predictions.overallStatus} />
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Specs Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Specifications</Text>
        <View style={styles.specsGrid}>
          {bike.year && (
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Year</Text>
              <Text style={styles.specValue}>{bike.year}</Text>
            </View>
          )}
          {bike.category && (
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Category</Text>
              <Text style={styles.specValue}>{bike.category}</Text>
            </View>
          )}
          {bike.travelForkMm && (
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Fork Travel</Text>
              <Text style={styles.specValue}>{bike.travelForkMm}mm</Text>
            </View>
          )}
          {bike.travelShockMm && (
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Shock Travel</Text>
              <Text style={styles.specValue}>{bike.travelShockMm}mm</Text>
            </View>
          )}
          {bike.frameMaterial && (
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Frame</Text>
              <Text style={styles.specValue}>{bike.frameMaterial}</Text>
            </View>
          )}
          {bike.isEbike && (
            <>
              {bike.motorMaker && (
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Motor</Text>
                  <Text style={styles.specValue}>
                    {bike.motorMaker} {bike.motorModel || ''}
                  </Text>
                </View>
              )}
              {bike.batteryWh && (
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Battery</Text>
                  <Text style={styles.specValue}>{bike.batteryWh}Wh</Text>
                </View>
              )}
            </>
          )}
        </View>
      </View>

      {/* Components Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Components</Text>
          {predictions && (
            <Text style={styles.sectionSubtitle}>
              {predictions.dueNowCount > 0 && `${predictions.dueNowCount} due now`}
              {predictions.dueNowCount > 0 && predictions.dueSoonCount > 0 && ' · '}
              {predictions.dueSoonCount > 0 && `${predictions.dueSoonCount} due soon`}
            </Text>
          )}
        </View>
        <View style={styles.componentsList}>
          {sortedComponents.length === 0 ? (
            <View style={styles.emptyComponents}>
              <Text style={styles.emptyText}>No components tracked yet</Text>
            </View>
          ) : (
            sortedComponents.map((component) => {
              const prediction = predictionMap.get(component.id);
              return (
                <ComponentRow
                  key={component.id}
                  component={component}
                  status={prediction?.status || component.status || undefined}
                  hoursRemaining={prediction?.hoursRemaining}
                  onPress={() => handleComponentPress(component)}
                />
              );
            })
          )}
        </View>
      </View>

      {/* Notes Section */}
      {bike.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <View style={styles.notesBox}>
            <Text style={styles.notesText}>{bike.notes}</Text>
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actionsSection}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowLogService(true)}
        >
          <Ionicons name="construct" size={20} color="#2563eb" />
          <Text style={styles.actionButtonText}>Log Service</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomPadding} />

      {/* Log Service Sheet */}
      <LogServiceSheet
        visible={showLogService}
        onClose={() => setShowLogService(false)}
        components={bike.components || []}
        onServiceLogged={refetch}
      />

      {/* Component Detail Sheet */}
      <ComponentDetailSheet
        visible={!!selectedComponent && !showReplaceSheet}
        component={selectedComponent}
        prediction={selectedComponent ? predictionMap.get(selectedComponent.id) : null}
        onClose={() => setSelectedComponent(null)}
        onLogService={handleLogServiceFromDetail}
        onReplace={handleReplaceFromDetail}
      />

      {/* Replace Component Sheet */}
      <ReplaceComponentSheet
        visible={showReplaceSheet}
        component={selectedComponent}
        bikeId={bike.id}
        spareComponents={data?.spareComponents || []}
        onClose={() => setShowReplaceSheet(false)}
        onReplaced={handleReplaceComplete}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  errorTitle: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: '600',
    color: '#1f2937',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#2563eb',
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  hero: {
    height: 220,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e5e7eb',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingTop: 40,
  },
  heroContent: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 12,
    borderRadius: 8,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  heroStatusRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  section: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1f2937',
    padding: 16,
    paddingBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#f97316',
    fontWeight: '500',
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  specItem: {
    width: '50%',
    marginBottom: 12,
  },
  specLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  specValue: {
    fontSize: 15,
    color: '#1f2937',
    fontWeight: '500',
  },
  componentsList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
  },
  emptyComponents: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  notesBox: {
    padding: 16,
    paddingTop: 0,
  },
  notesText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  bottomPadding: {
    height: 32,
  },
  actionsSection: {
    marginTop: 16,
    marginHorizontal: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
  },
});
