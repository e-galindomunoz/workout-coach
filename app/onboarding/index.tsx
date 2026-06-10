import { PlaceholderScreen, ScreenLink } from '../../components/PlaceholderScreen';

export default function OnboardingScreen() {
  return (
    <PlaceholderScreen
      title="Onboarding"
      description="Onboarding flow, profile capture, and personalization will be added in a later stage."
    >
      <ScreenLink href="/tabs/dashboard" label="Finish and open Dashboard" />
    </PlaceholderScreen>
  );
}
