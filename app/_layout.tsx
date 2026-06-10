import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../components/AuthProvider';
import { colors } from '../lib/theme';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ title: 'Login' }} />
        <Stack.Screen name="auth/signup" options={{ title: 'Signup' }} />
        <Stack.Screen name="onboarding/index" options={{ title: 'Onboarding' }} />
        <Stack.Screen name="settings/profile" options={{ title: 'Edit Profile' }} />
        <Stack.Screen name="progress/[exerciseName]" options={{ title: 'Exercise Detail' }} />
        <Stack.Screen name="workout/new" options={{ title: 'Start Workout' }} />
        <Stack.Screen name="workout/[id]" options={{ title: 'Workout Summary' }} />
        <Stack.Screen name="tabs" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}
