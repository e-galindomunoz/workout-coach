import { Redirect } from 'expo-router';
import { AuthForm } from '../../components/AuthForm';
import { LoadingScreen } from '../../components/LoadingScreen';
import { useAuth } from '../../components/AuthProvider';

export default function LoginScreen() {
  const { initialized, session } = useAuth();

  if (!initialized) {
    return <LoadingScreen message="Checking your session..." />;
  }

  if (session) {
    return <Redirect href="/tabs/dashboard" />;
  }

  return (
    <AuthForm
      mode="login"
      title="Welcome back"
      description="Sign in with your Supabase account to open the app."
      alternateHref="/auth/signup"
      alternateLabel="Need an account? Create one"
    />
  );
}
