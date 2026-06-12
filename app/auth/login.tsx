import { Redirect } from 'expo-router';
import { AuthForm } from '../../components/AuthForm';
import { LoadingScreen } from '../../components/LoadingScreen';
import { useAuth } from '../../components/AuthProvider';

export default function LoginScreen() {
  const { initialized, profileComplete, profileReady, session } = useAuth();

  if (!initialized) {
    return <LoadingScreen message="Checking your session..." />;
  }

  if (session) {
    if (!profileReady) {
      return <LoadingScreen message="Loading your profile..." />;
    }

    return <Redirect href={profileComplete ? '/tabs/dashboard' : '/onboarding'} />;
  }

  return (
    <AuthForm
      mode="login"
      alternateHref="/auth/signup"
      alternateLabel="Need an account? Create one"
    />
  );
}
