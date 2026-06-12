import { Redirect } from 'expo-router';
import { AuthForm } from '../../components/AuthForm';
import { LoadingScreen } from '../../components/LoadingScreen';
import { useAuth } from '../../components/AuthProvider';

export default function LoginScreen() {
  const { initialized, profileComplete, session } = useAuth();

  if (!initialized) {
    return <LoadingScreen message="Checking your session..." />;
  }

  if (session) {
    return <Redirect href={profileComplete ? '/tabs/dashboard' : '/onboarding'} />;
  }

  return (
    <AuthForm
      mode="login"
      title="Welcome back"
      alternateHref="/auth/signup"
      alternateLabel="Need an account? Create one"
    />
  );
}
