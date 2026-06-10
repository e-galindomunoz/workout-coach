import { PlaceholderScreen, ScreenLink } from '../components/PlaceholderScreen';

export default function HomeScreen() {
  return (
    <PlaceholderScreen
      title="Workout Coach"
      description="Expo Router and Expo Dev Client are configured. This Stage 0 build only includes placeholder navigation for the future iOS-first app."
    >
      <ScreenLink href="/auth/login" label="Go to Login" />
      <ScreenLink href="/auth/signup" label="Go to Signup" />
      <ScreenLink href="/onboarding" label="Go to Onboarding" />
      <ScreenLink href="/tabs/dashboard" label="Open App Tabs" />
    </PlaceholderScreen>
  );
}
