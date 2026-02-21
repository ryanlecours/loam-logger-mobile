import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  ComponentFieldsFragment,
  useInstallComponentMutation,
} from '../../graphql/generated';

interface ReplaceComponentSheetProps {
  visible: boolean;
  component: ComponentFieldsFragment | null;
  bikeId: string;
  spareComponents: ComponentFieldsFragment[];
  onClose: () => void;
  onReplaced: () => void;
}

type TabType = 'spare' | 'new';

function formatComponentType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

export function ReplaceComponentSheet({
  visible,
  component,
  bikeId,
  spareComponents,
  onClose,
  onReplaced,
}: ReplaceComponentSheetProps) {
  const [activeTab, setActiveTab] = useState<TabType>('spare');
  const [selectedSpareId, setSelectedSpareId] = useState<string | null>(null);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [note, setNote] = useState('');

  const [installComponent, { loading }] = useInstallComponentMutation();

  // Filter spare components to only those matching the component type
  const matchingSpares = component
    ? spareComponents.filter((spare) => spare.type === component.type)
    : [];

  const resetForm = useCallback(() => {
    setActiveTab('spare');
    setSelectedSpareId(null);
    setBrand('');
    setModel('');
    setNote('');
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleSubmit = useCallback(async () => {
    if (!component) return;

    // Build slotKey from type and location
    const slotKey = component.location
      ? `${component.type}_${component.location}`
      : component.type;

    try {
      if (activeTab === 'spare' && selectedSpareId) {
        await installComponent({
          variables: {
            input: {
              bikeId,
              slotKey,
              existingComponentId: selectedSpareId,
              noteText: note || undefined,
            },
          },
          refetchQueries: ['Gear'],
        });
      } else if (activeTab === 'new' && brand.trim() && model.trim()) {
        await installComponent({
          variables: {
            input: {
              bikeId,
              slotKey,
              newComponent: {
                brand: brand.trim(),
                model: model.trim(),
              },
              noteText: note || undefined,
            },
          },
          refetchQueries: ['Gear'],
        });
      } else {
        Alert.alert('Validation Error', 'Please fill in all required fields.');
        return;
      }

      Alert.alert('Component Replaced', 'The component has been replaced successfully.', [
        {
          text: 'OK',
          onPress: () => {
            resetForm();
            onReplaced();
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    }
  }, [
    component,
    activeTab,
    selectedSpareId,
    brand,
    model,
    note,
    bikeId,
    installComponent,
    resetForm,
    onReplaced,
  ]);

  const canSubmit =
    (activeTab === 'spare' && selectedSpareId) ||
    (activeTab === 'new' && brand.trim() && model.trim());

  if (!component) return null;

  const typeName = formatComponentType(component.type);

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

              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>Replace {typeName}</Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              {/* Tabs */}
              <View style={styles.tabs}>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'spare' && styles.tabActive]}
                  onPress={() => setActiveTab('spare')}
                >
                  <Text
                    style={[styles.tabText, activeTab === 'spare' && styles.tabTextActive]}
                  >
                    Use Spare
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'new' && styles.tabActive]}
                  onPress={() => setActiveTab('new')}
                >
                  <Text
                    style={[styles.tabText, activeTab === 'new' && styles.tabTextActive]}
                  >
                    New Component
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
                {activeTab === 'spare' ? (
                  matchingSpares.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Ionicons name="cube-outline" size={48} color="#d1d5db" />
                      <Text style={styles.emptyText}>
                        No spare {typeName.toLowerCase()} components available
                      </Text>
                    </View>
                  ) : (
                    matchingSpares.map((spare) => {
                      const isSelected = selectedSpareId === spare.id;
                      const spareBrandModel = [spare.brand, spare.model]
                        .filter(Boolean)
                        .join(' ');

                      return (
                        <TouchableOpacity
                          key={spare.id}
                          style={[
                            styles.spareItem,
                            isSelected && styles.spareItemSelected,
                          ]}
                          onPress={() => setSelectedSpareId(spare.id)}
                        >
                          <View style={styles.spareContent}>
                            <Text style={styles.spareBrand}>
                              {spareBrandModel || 'Unknown'}
                            </Text>
                            <Text style={styles.spareHours}>
                              {spare.hoursUsed?.toFixed(0) || 0}h used
                            </Text>
                          </View>
                          {isSelected && (
                            <Ionicons name="checkmark-circle" size={24} color="#2563eb" />
                          )}
                        </TouchableOpacity>
                      );
                    })
                  )
                ) : (
                  <View style={styles.form}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Brand *</Text>
                      <TextInput
                        style={styles.input}
                        value={brand}
                        onChangeText={setBrand}
                        placeholder="e.g., Fox"
                        placeholderTextColor="#9ca3af"
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Model *</Text>
                      <TextInput
                        style={styles.input}
                        value={model}
                        onChangeText={setModel}
                        placeholder="e.g., 36 Factory"
                        placeholderTextColor="#9ca3af"
                      />
                    </View>
                  </View>
                )}

                {/* Note Field */}
                <View style={styles.noteSection}>
                  <Text style={styles.inputLabel}>Note (optional)</Text>
                  <TextInput
                    style={[styles.input, styles.noteInput]}
                    value={note}
                    onChangeText={setNote}
                    placeholder="Why are you making this change?"
                    placeholderTextColor="#9ca3af"
                    multiline
                    numberOfLines={3}
                    maxLength={500}
                    textAlignVertical="top"
                  />
                </View>
              </ScrollView>

              {/* Footer */}
              <View style={styles.footer}>
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    (!canSubmit || loading) && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={!canSubmit || loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="swap-horizontal" size={20} color="#fff" />
                      <Text style={styles.submitButtonText}>Replace Component</Text>
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
    maxHeight: '85%',
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
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#2563eb',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#fff',
  },
  content: {
    paddingHorizontal: 20,
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
  spareItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    marginBottom: 8,
  },
  spareItemSelected: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  spareContent: {
    flex: 1,
  },
  spareBrand: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1f2937',
  },
  spareHours: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  input: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    color: '#1f2937',
  },
  noteSection: {
    marginTop: 20,
    gap: 6,
  },
  noteInput: {
    height: 80,
    paddingTop: 12,
  },
  footer: {
    padding: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
    marginTop: 8,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
