import { PlaceholderScreen, ScreenLink } from '../../components/PlaceholderScreen';

export default function SignupScreen() {
  return (
    <PlaceholderScreen
      title="Signup"
      description="Account creation will be added later. This screen is only a placeholder for Stage 0 navigation."
    >
      <ScreenLink href="/auth/login" label="Already have an account? Login" />
      <ScreenLink href="/onboarding" label="Continue to Onboarding" />
    </PlaceholderScreen>
  );
}
