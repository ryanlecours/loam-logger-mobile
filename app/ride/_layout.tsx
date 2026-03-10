import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function RideLayout() {
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2d5016',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Ride Details',
          headerLeft: () => (
            <TouchableOpacity
                onPress={() => router.back()}
                style={{ marginRight: 8, justifyContent: 'center', alignItems: 'center', width: 32, height: 32 }}
              >
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="add"
        options={{
          title: 'Add Ride',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="edit/[id]"
        options={{
          title: 'Edit Ride',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
