import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, RefreshControl, Alert, ActionSheetIOS, Platform, Modal, TouchableWithoutFeedback } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { useGearQuery, useDeleteBikeMutation, useRetireBikeMutation, useReactivateBikeMutation, BikeStatus, ComponentFieldsFragment } from '../../src/graphql/generated';
import { ComponentHealthBadge } from '../../src/components/gear/ComponentHealthBadge';
import { ComponentRow } from '../../src/components/gear/ComponentRow';
import { LogServiceSheet } from '../../src/components/gear/LogServiceSheet';
import { ComponentDetailSheet } from '../../src/components/gear/ComponentDetailSheet';
import { ReplaceComponentSheet } from '../../src/components/gear/ReplaceComponentSheet';
import { UpgradePrompt } from '../../src/components/common/UpgradePrompt';
import { useUserTier } from '../../src/hooks/useUserTier';
import { FREE_LIGHT_COMPONENT_TYPES } from '../../src/constants/tiers';
import { colors } from '../../src/constants/theme';

const COMPONENT_GROUP_MAP: Record<string, string> = {
  FORK: 'Suspension', SHOCK: 'Suspension',
  CHAIN: 'Drivetrain', CASSETTE: 'Drivetrain', REAR_DERAILLEUR: 'Drivetrain',
  CRANK: 'Drivetrain', DRIVETRAIN: 'Drivetrain', PEDALS: 'Drivetrain',
  BRAKE_PAD: 'Brakes', BRAKE_ROTOR: 'Brakes', BRAKES: 'Brakes',
  TIRES: 'Wheels & Tires', RIMS: 'Wheels & Tires', WHEEL_HUBS: 'Wheels & Tires',
  HANDLEBAR: 'Cockpit', STEM: 'Cockpit', DROPPER: 'Cockpit',
  SADDLE: 'Cockpit', SEATPOST: 'Cockpit',
  HEADSET: 'Bearings', BOTTOM_BRACKET: 'Bearings', PIVOT_BEARINGS: 'Bearings',
};

const GROUP_ORDER = ['Suspension', 'Drivetrain', 'Brakes', 'Wheels & Tires', 'Cockpit', 'Bearings', 'Other'];

const STATUS_ORDER: Record<string, number> = {
  OVERDUE: 0, DUE_NOW: 1, DUE_SOON: 2, ALL_GOOD: 3, UNKNOWN: 4,
};

export default function BikeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isFreeLight } = useUserTier();
  const [showLogService, setShowLogService] = useState(false);
  const [servicePreSelectedId, setServicePreSelectedId] = useState<string | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<ComponentFieldsFragment | null>(null);
  const [showReplaceSheet, setShowReplaceSheet] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const { data, loading, error, refetch } = useGearQuery({
    fetchPolicy: 'cache-and-network',
  });

  const [deleteBike] = useDeleteBikeMutation();
  const [retireBike] = useRetireBikeMutation();
  const [reactivateBike] = useReactivateBikeMutation();

  const bike = data?.bikes?.find((b) => b.id === id);
  const predictions = bike?.predictions;

  const predictionMap = useMemo(() => {
    const components = predictions?.components || [];
    return new Map(components.map((p) => [p.componentId, p]));
  }, [predictions?.components]);

  const componentGroups = useMemo(() => {
    const bikeComponents = bike?.components || [];
    const groups = new Map<string, ComponentFieldsFragment[]>();
    for (const comp of bikeComponents) {
      const group = COMPONENT_GROUP_MAP[comp.type] || 'Other';
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group)!.push(comp);
    }
    for (const [, comps] of groups) {
      comps.sort((a, b) => {
        const locA = a.location === 'FRONT' ? 0 : a.location === 'REAR' ? 1 : 2;
        const locB = b.location === 'FRONT' ? 0 : b.location === 'REAR' ? 1 : 2;
        if (locA !== locB) return locA - locB;
        const predA = predictionMap.get(a.id);
        const predB = predictionMap.get(b.id);
        const orderA = STATUS_ORDER[predA?.status || a.status || 'UNKNOWN'] ?? 4;
        const orderB = STATUS_ORDER[predB?.status || b.status || 'UNKNOWN'] ?? 4;
        return orderA - orderB;
      });
    }
    return GROUP_ORDER
      .filter((g) => groups.has(g))
      .map((g) => ({ name: g, components: groups.get(g)! }));
  }, [bike?.components, predictionMap]);

  if (loading && !data) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Loading...' }} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !bike) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Error' }} />
        <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
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

  const toggleGroup = (name: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const isComponentRestricted = (type: string) =>
    isFreeLight && !(FREE_LIGHT_COMPONENT_TYPES as readonly string[]).includes(type);

  const handleComponentPress = (component: ComponentFieldsFragment) => {
    if (isComponentRestricted(component.type)) {
      setShowUpgradePrompt(true);
      return;
    }
    setSelectedComponent(component);
  };

  const handleLogServiceFromDetail = () => {
    const componentId = selectedComponent?.id ?? null;
    setSelectedComponent(null);
    setTimeout(() => {
      setServicePreSelectedId(componentId);
      setShowLogService(true);
    }, 300);
  };

  const handleReplaceFromDetail = () => {
    setShowReplaceSheet(true);
  };

  const handleReplaceComplete = () => {
    setShowReplaceSheet(false);
    setSelectedComponent(null);
    refetch();
  };

  const handleRetireSell = () => {
    const options = ['Mark as Retired', 'Mark as Sold', 'Cancel'];
    const cancelButtonIndex = 2;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          title: 'Retire or Sell Bike',
          message: 'This bike will be moved to your retired bikes list. You can still view its history.',
        },
        (buttonIndex) => {
          if (buttonIndex === 0) confirmRetire('RETIRED');
          else if (buttonIndex === 1) confirmRetire('SOLD');
        }
      );
    } else {
      Alert.alert(
        'Retire or Sell Bike',
        'This bike will be moved to your retired bikes list.',
        [
          { text: 'Mark as Retired', onPress: () => confirmRetire('RETIRED') },
          { text: 'Mark as Sold', onPress: () => confirmRetire('SOLD') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const confirmRetire = async (status: 'RETIRED' | 'SOLD') => {
    try {
      await retireBike({
        variables: { id: bike.id, status: status as BikeStatus },
      });
      await refetch();
      router.back();
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    }
  };

  const handleReactivate = () => {
    Alert.alert(
      'Reactivate Bike?',
      'This will move the bike back to your active bikes list.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reactivate',
          onPress: async () => {
            try {
              await reactivateBike({ variables: { id: bike.id } });
              await refetch();
              router.back();
            } catch (err) {
              Alert.alert('Error', (err as Error).message);
            }
          },
        },
      ]
    );
  };

  const isInactive = bike.status === BikeStatus.Retired || bike.status === BikeStatus.Sold;

  const handleDelete = () => {
    Alert.alert(
      'Delete Bike?',
      'This will permanently delete this bike, all its components, and service history. Rides will be preserved but no longer associated with this bike. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBike({ variables: { id: bike.id } });
              await refetch();
              router.back();
            } catch (err) {
              Alert.alert('Error', (err as Error).message);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.primary} />
      }
    >
      <Stack.Screen
        options={{
          title: displayName,
          headerBackTitle: '',
        }}
      />

      {/* Hero Section */}
      <View style={styles.hero}>
        {bike.thumbnailUrl ? (
          <Image source={{ uri: bike.thumbnailUrl }} style={styles.heroImage} resizeMode="cover" />
        ) : (
          <View style={styles.heroPlaceholder}>
            <Ionicons name="bicycle" size={80} color={colors.textMuted} />
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
          {componentGroups.length === 0 ? (
            <View style={styles.emptyComponents}>
              <Text style={styles.emptyText}>No components tracked yet</Text>
            </View>
          ) : (
            componentGroups.map((group) => {
              const isCollapsed = collapsedGroups.has(group.name);
              // Count components needing attention in this group
              const attentionCount = group.components.filter((c) => {
                const pred = predictionMap.get(c.id);
                const s = pred?.status || c.status;
                return s === 'OVERDUE' || s === 'DUE_NOW' || s === 'DUE_SOON';
              }).length;

              return (
                <View key={group.name}>
                  <TouchableOpacity
                    style={styles.groupHeader}
                    onPress={() => toggleGroup(group.name)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.groupHeaderLeft}>
                      <Ionicons
                        name={isCollapsed ? 'chevron-forward' : 'chevron-down'}
                        size={16}
                        color={colors.textMuted}
                      />
                      <Text style={styles.groupHeaderText}>{group.name}</Text>
                      <Text style={styles.groupCount}>{group.components.length}</Text>
                    </View>
                    {attentionCount > 0 && (
                      <View style={styles.attentionBadge}>
                        <Text style={styles.attentionBadgeText}>{attentionCount}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  {!isCollapsed && group.components.map((component) => {
                    const prediction = predictionMap.get(component.id);
                    return (
                      <ComponentRow
                        key={component.id}
                        component={component}
                        status={prediction?.status || component.status || undefined}
                        hoursRemaining={prediction?.hoursRemaining}
                        restricted={isComponentRestricted(component.type)}
                        onPress={() => handleComponentPress(component)}
                      />
                    );
                  })}
                </View>
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
          <Ionicons name="construct" size={20} color={colors.primary} />
          <Text style={styles.actionButtonText}>Log Service</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push(`/bike/history/${id}`)}
        >
          <Ionicons name="time-outline" size={20} color={colors.primary} />
          <Text style={styles.actionButtonText}>View Full History</Text>
        </TouchableOpacity>

        {isInactive ? (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleReactivate}
          >
            <Ionicons name="refresh-outline" size={20} color={colors.primary} />
            <Text style={styles.actionButtonText}>Reactivate Bike</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleRetireSell}
          >
            <Ionicons name="archive-outline" size={20} color={colors.warning} />
            <Text style={[styles.actionButtonText, { color: colors.warning }]}>Retire / Sell</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.dangerButton}
          onPress={handleDelete}
        >
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
          <Text style={styles.dangerButtonText}>Delete Bike</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomPadding} />

      <LogServiceSheet
        visible={showLogService}
        onClose={() => {
          setShowLogService(false);
          setServicePreSelectedId(null);
        }}
        components={bike.components || []}
        onServiceLogged={refetch}
        preSelectedId={servicePreSelectedId}
      />

      <ComponentDetailSheet
        visible={!!selectedComponent && !showReplaceSheet}
        component={selectedComponent}
        prediction={selectedComponent ? predictionMap.get(selectedComponent.id) : null}
        onClose={() => setSelectedComponent(null)}
        onLogService={handleLogServiceFromDetail}
        onReplace={handleReplaceFromDetail}
      />

      <ReplaceComponentSheet
        visible={showReplaceSheet}
        component={selectedComponent}
        bikeId={bike.id}
        spareComponents={data?.spareComponents || []}
        onClose={() => setShowReplaceSheet(false)}
        onReplaced={handleReplaceComplete}
      />

      <Modal
        visible={showUpgradePrompt}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUpgradePrompt(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowUpgradePrompt(false)}>
          <View style={styles.upgradeOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.upgradeContent}>
                <UpgradePrompt
                  message="This component type requires a Pro plan or a completed referral to track."
                  onUpgrade={() => setShowUpgradePrompt(false)}
                  onReferral={() => setShowUpgradePrompt(false)}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  errorTitle: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryText: {
    color: colors.textPrimary,
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
    backgroundColor: colors.card,
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 12,
    borderRadius: 8,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  heroStatusRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  section: {
    marginTop: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
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
    color: colors.textPrimary,
    padding: 16,
    paddingBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.warning,
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
    color: colors.textSecondary,
    marginBottom: 2,
  },
  specValue: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  componentsList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  groupHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupCount: {
    fontSize: 12,
    color: colors.textMuted,
  },
  attentionBadge: {
    backgroundColor: colors.warningBg,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  attentionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.warning,
  },
  emptyComponents: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  notesBox: {
    padding: 16,
    paddingTop: 0,
  },
  notesText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  bottomPadding: {
    height: 32,
  },
  actionsSection: {
    marginTop: 16,
    marginHorizontal: 16,
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.danger,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.danger,
  },
  upgradeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    padding: 24,
  },
  upgradeContent: {
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
});
