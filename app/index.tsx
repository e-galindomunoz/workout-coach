import { Redirect } from 'expo-router';
import { LoadingScreen } from '../components/LoadingScreen';
import { useAuth } from '../components/AuthProvider';

export default function HomeScreen() {
  const { initialized, session } = useAuth();

  if (!initialized) {
    return <LoadingScreen message="Checking your session..." />;
  }

  if (session) {
    return <Redirect href="/tabs/dashboard" />;
  }

  return <Redirect href="/auth/login" />;
}
