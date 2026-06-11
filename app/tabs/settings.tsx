import { useRouter } from 'expo-router';
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
import { colors, fontSizes, fontWeights, spacing } from '../../lib/theme';

export default function SettingsScreen() {
  const router = useRouter();
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
      description="Account, profile, and app preferences."
    >
      {/* Account */}
      <Card accent>
        <SectionHeader title="Account" subtitle="Your authenticated session." />
        <View style={styles.accountRow}>
          <Pill label="Active" tone="success" />
          <Text style={styles.email}>{user?.email ?? 'Unknown'}</Text>
        </View>
      </Card>

      {/* Profile */}
      <Card>
        <SectionHeader title="Fitness Profile" subtitle="Your training data powering the app." />
        {profile ? (
          <View style={styles.profileRows}>
            {profile.name ? (
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Name</Text>
                <Text style={styles.profileValue}>{profile.name}</Text>
              </View>
            ) : null}
            {profile.main_goal ? (
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Goal</Text>
                <Text style={styles.profileValue}>{profile.main_goal}</Text>
              </View>
            ) : null}
            {profile.experience_level ? (
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Level</Text>
                <Text style={styles.profileValue}>{profile.experience_level}</Text>
              </View>
            ) : null}
            {profile.days_per_week ? (
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Days / week</Text>
                <Text style={styles.profileValue}>{profile.days_per_week}</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <Text style={styles.profileMissing}>Profile not set.</Text>
        )}
        <Button
          label="Edit Profile"
          onPress={() => router.push('/settings/profile')}
          variant="secondary"
          size="sm"
          style={styles.editButton}
        />
      </Card>

      {/* Features */}
      <Card>
        <SectionHeader title="Active Features" subtitle="Everything running in Ironline." />
        <View style={styles.pillRow}>
          <Pill label="Auth" tone="accent" />
          <Pill label="Onboarding" tone="accent" />
          <Pill label="Weight logging" tone="accent" />
          <Pill label="Workout logging" tone="accent" />
          <Pill label="PR tracking" tone="accent" />
          <Pill label="Progression" tone="accent" />
          <Pill label="AI coach" tone="accent" />
          <Pill label="Workout insights" tone="accent" />
        </View>
      </Card>

      {error ? <ErrorState message={error} /> : null}

      <Button
        label={loading ? 'Signing out...' : 'Sign Out'}
        loading={loading}
        onPress={() => void handleLogout()}
        variant="danger"
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  accountRow: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  email: {
    color: colors.textMuted,
    fontSize: fontSizes.md,
    lineHeight: 22,
  },
  profileRows: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  profileRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  profileLabel: {
    color: colors.textSoft,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.heavy,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  profileValue: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    textAlign: 'right',
  },
  profileMissing: {
    color: colors.textMuted,
    fontSize: fontSizes.md,
    lineHeight: 22,
    marginTop: spacing.xs,
  },
  editButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.md,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
