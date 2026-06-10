import { Redirect } from 'expo-router';
import { useAuth } from '../../components/AuthProvider';
import { LoadingScreen } from '../../components/LoadingScreen';
import { PlaceholderScreen, ScreenLink } from '../../components/PlaceholderScreen';

export default function OnboardingScreen() {
  const { initialized, session } = useAuth();

  if (!initialized) {
    return <LoadingScreen message="Loading onboarding..." />;
  }

  if (!session) {
    return <Redirect href="/auth/login" />;
  }

  return (
    <PlaceholderScreen
      title="Onboarding"
      description="Authentication is active. Full onboarding and profile capture will be added in a later stage."
    >
      <ScreenLink href="/tabs/dashboard" label="Finish and open Dashboard" />
    </PlaceholderScreen>
  );
}
