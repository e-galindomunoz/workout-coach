import { PlaceholderScreen, ScreenLink } from '../../components/PlaceholderScreen';

export default function LoginScreen() {
  return (
    <PlaceholderScreen
      title="Login"
      description="Authentication UI will be built in a later stage. This placeholder confirms routing is wired correctly."
    >
      <ScreenLink href="/auth/signup" label="Need an account? Sign up" />
      <ScreenLink href="/tabs/dashboard" label="Continue to Dashboard" />
    </PlaceholderScreen>
  );
}
