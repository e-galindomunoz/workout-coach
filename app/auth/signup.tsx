import { Redirect, Stack } from 'expo-router';
import { AuthForm } from '../../components/AuthForm';
import { LoadingScreen } from '../../components/LoadingScreen';
import { useAuth } from '../../components/AuthProvider';

export default function SignupScreen() {
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
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AuthForm
        mode="signup"
        alternateHref="/auth/login"
        alternateLabel="Already have an account? Log in"
      />
    </>
  );
}
