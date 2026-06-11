import { Redirect, useRouter } from 'expo-router';
import { AppScreen } from '../../components/AppScreen';
import { useAuth } from '../../components/AuthProvider';
import { LoadingScreen } from '../../components/LoadingScreen';
import { ProfileForm } from '../../components/ProfileForm';

export default function EditProfileScreen() {
  const router = useRouter();
  const { applyProfile, initialized, profile, session } = useAuth();

  if (!initialized) {
    return <LoadingScreen message="Loading your profile..." />;
  }

  if (!session) {
    return <Redirect href="/auth/login" />;
  }

  return (
    <AppScreen
      title="Edit Profile"
      description="Update your training data and preferences."
      fillContent
      scrollEnabled={false}
    >
      <ProfileForm
        initialProfile={profile}
        mode="edit"
        onSaved={async (savedProfile) => {
          applyProfile(savedProfile);
          router.back();
        }}
      />
    </AppScreen>
  );
}
