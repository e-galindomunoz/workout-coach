import { Redirect } from 'expo-router';
import { LoadingScreen } from '../components/LoadingScreen';
import { useAuth } from '../components/AuthProvider';

export default function HomeScreen() {
  const { initialized, profileComplete, session } = useAuth();

  if (!initialized) {
    return <LoadingScreen message="Checking your session..." />;
  }

  if (session) {
    return <Redirect href={profileComplete ? '/tabs/dashboard' : '/onboarding'} />;
  }

  return <Redirect href="/auth/login" />;
}
