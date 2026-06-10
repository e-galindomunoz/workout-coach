import { Redirect } from 'expo-router';
import { AuthForm } from '../../components/AuthForm';
import { LoadingScreen } from '../../components/LoadingScreen';
import { useAuth } from '../../components/AuthProvider';

export default function SignupScreen() {
  const { initialized, session } = useAuth();

  if (!initialized) {
    return <LoadingScreen message="Checking your session..." />;
  }

  if (session) {
    return <Redirect href="/tabs/dashboard" />;
  }

  return (
    <AuthForm
      mode="signup"
      title="Create account"
      description="Set up your account with email and password. You can add the rest of your profile later."
      alternateHref="/auth/login"
      alternateLabel="Already have an account? Log in"
    />
  );
}
