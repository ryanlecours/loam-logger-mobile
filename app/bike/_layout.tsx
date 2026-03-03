import { Stack } from 'expo-router';

export default function BikeLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTintColor: '#2563eb',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Bike Details',
        }}
      />
      <Stack.Screen
        name="add"
        options={{
          title: 'Add Bike',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
