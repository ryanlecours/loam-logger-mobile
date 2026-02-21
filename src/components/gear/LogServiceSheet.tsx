import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ComponentFieldsFragment, useLogComponentServiceMutation } from '../../graphql/generated';
import { StatusDot } from './StatusDot';

interface LogServiceSheetProps {
  visible: boolean;
  onClose: () => void;
  components: ComponentFieldsFragment[];
  onServiceLogged?: () => void;
}

function formatComponentType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatLocation(location: string | null | undefined): string {
  if (!location) return '';
  return location
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

export function LogServiceSheet({
  visible,
  onClose,
  components,
  onServiceLogged,
}: LogServiceSheetProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [logService, { loading }] = useLogComponentServiceMutation();

  const handleLogService = useCallback(async () => {
    if (!selectedId) return;

    try {
      await logService({
        variables: {
          id: selectedId,
          performedAt: new Date().toISOString(),
        },
      });

      Alert.alert('Service Logged', 'Component service has been recorded.', [
        {
          text: 'OK',
          onPress: () => {
            setSelectedId(null);
            onClose();
            onServiceLogged?.();
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    }
  }, [selectedId, logService, onClose, onServiceLogged]);

  const handleClose = useCallback(() => {
    setSelectedId(null);
    onClose();
  }, [onClose]);

  // Filter to only serviceable components (those with service intervals)
  const serviceableComponents = components.filter(
    (c) => c.serviceDueAtHours !== null && c.serviceDueAtHours !== undefined
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              <View style={styles.handle} />

              <View style={styles.header}>
                <Text style={styles.title}>Log Service</Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <Text style={styles.subtitle}>
                Select a component to record a service
              </Text>

              <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                {serviceableComponents.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="construct-outline" size={48} color="#d1d5db" />
                    <Text style={styles.emptyText}>
                      No serviceable components found
                    </Text>
                  </View>
                ) : (
                  serviceableComponents.map((component) => {
                    const isSelected = selectedId === component.id;
                    const typeName = formatComponentType(component.type);
                    const location = formatLocation(component.location);
                    const brandModel = [component.brand, component.model]
                      .filter(Boolean)
                      .join(' ');

                    return (
                      <TouchableOpacity
                        key={component.id}
                        style={[
                          styles.componentItem,
                          isSelected && styles.componentItemSelected,
                        ]}
                        onPress={() => setSelectedId(component.id)}
                        activeOpacity={0.7}
                      >
                        <StatusDot status={component.status || 'UNKNOWN'} />
                        <View style={styles.componentContent}>
                          <Text style={styles.componentType}>
                            {typeName}
                            {location ? ` (${location})` : ''}
                          </Text>
                          {brandModel && (
                            <Text style={styles.componentBrand}>{brandModel}</Text>
                          )}
                          <Text style={styles.componentHours}>
                            {component.hoursUsed?.toFixed(0) || 0} /{' '}
                            {component.serviceDueAtHours}h
                          </Text>
                        </View>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={24} color="#2563eb" />
                        )}
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>

              <View style={styles.footer}>
                <TouchableOpacity
                  style={[
                    styles.logButton,
                    (!selectedId || loading) && styles.logButtonDisabled,
                  ]}
                  onPress={handleLogService}
                  disabled={!selectedId || loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={20} color="#fff" />
                      <Text style={styles.logButtonText}>Log Service</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 34,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  closeButton: {
    padding: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  list: {
    maxHeight: 300,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    color: '#9ca3af',
    textAlign: 'center',
  },
  componentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  componentItemSelected: {
    backgroundColor: '#eff6ff',
  },
  componentContent: {
    flex: 1,
  },
  componentType: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1f2937',
  },
  componentBrand: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  componentHours: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  footer: {
    padding: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
  },
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  logButtonDisabled: {
    opacity: 0.5,
  },
  logButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
