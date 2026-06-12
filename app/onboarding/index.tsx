import { Redirect, useRouter } from 'expo-router';
import { AppScreen } from '../../components/AppScreen';
import { ProfileForm } from '../../components/ProfileForm';
import { useAuth } from '../../components/AuthProvider';
import { LoadingScreen } from '../../components/LoadingScreen';

export default function OnboardingScreen() {
  const router = useRouter();
  const { applyProfile, initialized, profile, profileComplete, profileReady, session } = useAuth();

  if (!initialized) {
    return <LoadingScreen message="Loading onboarding..." />;
  }

  if (!session) {
    return <Redirect href="/auth/login" />;
  }

  if (!profileReady) {
    return <LoadingScreen message="Loading your profile..." />;
  }

  if (profileComplete) {
    return <Redirect href="/tabs/dashboard" />;
  }

  return (
    <AppScreen
      title="Training Profile"
      description="A few details to personalize your progression and AI coaching."
      fillContent
      scrollEnabled={false}
    >
      <ProfileForm
        initialProfile={profile}
        mode="onboarding"
        onSaved={async (savedProfile) => {
          applyProfile(savedProfile);
          router.replace('/tabs/dashboard');
        }}
      />
    </AppScreen>
  );
}
