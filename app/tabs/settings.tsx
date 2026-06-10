import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { useAuth } from '../../components/AuthProvider';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/ErrorState';
import { Pill } from '../../components/ui/Pill';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { supabase } from '../../lib/supabase';
import { colors, fontSizes, spacing } from '../../lib/theme';

export default function SettingsScreen() {
  const { profile, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    setLoading(true);
    setError(null);

    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      setError(signOutError.message);
    }

    setLoading(false);
  }

  return (
    <AppScreen
      title="Settings"
      description="Account, profile, and Phase 1 status."
    >
      <Card accent>
        <SectionHeader title="Account" subtitle="Your authenticated session." />
        <Pill label="Signed in" tone="success" />
        <Text style={styles.value}>{user?.email ?? 'Unknown'}</Text>
      </Card>

      <Card>
        <SectionHeader title="Fitness profile" subtitle="Your onboarding data powering the app." />
        <Text style={styles.value}>
          {profile?.name
            ? `${profile.name}${profile.main_goal ? ` · ${profile.main_goal}` : ''}`
            : 'Profile incomplete'}
        </Text>
        <Link href="/settings/profile" style={styles.editLink}>
          Edit profile
        </Link>
      </Card>

      <Card>
        <SectionHeader title="Phase 1 features" subtitle="Everything active before AI coaching." />
        <View style={styles.pillRow}>
          <Pill label="Auth" tone="accent" />
          <Pill label="Onboarding" tone="accent" />
          <Pill label="Weight logging" tone="accent" />
          <Pill label="Workout logging" tone="accent" />
          <Pill label="PR tracking" tone="accent" />
          <Pill label="Progression" tone="accent" />
        </View>
        <Text style={styles.phaseNote}>Phase 2 will add the AI coach.</Text>
      </Card>

      {error ? <ErrorState message={error} /> : null}

      <Button
        label={loading ? 'Signing out...' : 'Log out'}
        loading={loading}
        onPress={() => void handleLogout()}
        variant="danger"
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  value: {
    color: colors.text,
    fontSize: fontSizes.lg,
    lineHeight: 24,
    marginTop: spacing.sm,
  },
  editLink: {
    color: colors.accent,
    fontSize: fontSizes.md,
    fontWeight: '800',
    marginTop: spacing.sm,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  phaseNote: {
    color: colors.textSoft,
    fontSize: fontSizes.sm,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
});
