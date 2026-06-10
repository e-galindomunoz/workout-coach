import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../components/AuthProvider';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#0f172a',
          },
          headerTintColor: '#f8fafc',
          contentStyle: {
            backgroundColor: '#0f172a',
          },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ title: 'Login' }} />
        <Stack.Screen name="auth/signup" options={{ title: 'Signup' }} />
        <Stack.Screen name="onboarding/index" options={{ title: 'Onboarding' }} />
        <Stack.Screen name="settings/profile" options={{ title: 'Edit Profile' }} />
        <Stack.Screen name="tabs" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}
