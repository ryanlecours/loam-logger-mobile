import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/constants/theme';

export default function ComponentLayout() {
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerBackTitle: '',
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="[id]"
        options={{
          title: 'History',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              // 32pt visual, but hitSlop brings the tappable area to the 44pt
              // minimum DESIGN.md's native mapping requires.
              hitSlop={8}
              style={{ marginRight: 8, justifyContent: 'center', alignItems: 'center', width: 32, height: 32 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          ),
        }}
      />
    </Stack>
  );
}
