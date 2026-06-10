import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '../../components/AuthProvider';
import { LoadingScreen } from '../../components/LoadingScreen';

export default function TabsLayout() {
  const { initialized, profileComplete, session } = useAuth();

  if (!initialized) {
    return <LoadingScreen message="Loading your account..." />;
  }

  if (!session) {
    return <Redirect href="/auth/login" />;
  }

  if (!profileComplete) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0f172a',
        },
        headerTintColor: '#f8fafc',
        sceneStyle: {
          backgroundColor: '#0f172a',
        },
        tabBarStyle: {
          backgroundColor: '#111827',
          borderTopColor: '#1f2937',
        },
        tabBarActiveTintColor: '#38bdf8',
        tabBarInactiveTintColor: '#94a3b8',
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="workout" options={{ title: 'Workout' }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
      <Tabs.Screen name="coach" options={{ title: 'Coach' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
