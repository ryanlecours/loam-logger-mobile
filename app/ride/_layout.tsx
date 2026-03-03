import { Stack } from 'expo-router';

export default function RideLayout() {
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
