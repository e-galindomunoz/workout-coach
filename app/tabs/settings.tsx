import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { useAuth } from '../../components/AuthProvider';
import { supabase } from '../../lib/supabase';

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
      description="Your auth session is active. Profile settings and preferences will be added in a later stage."
    >
      <View style={styles.card}>
        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.value}>{user?.email ?? 'Unknown user'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Current profile</Text>
        <Text style={styles.value}>
          {profile?.name ? `${profile.name} · ${profile.main_goal ?? 'goal pending'}` : 'Profile incomplete'}
        </Text>
        <Link href="/settings/profile" style={styles.editLink}>
          Edit fitness profile
        </Link>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable
        accessibilityRole="button"
        disabled={loading}
        onPress={handleLogout}
        style={({ pressed }) => [
          styles.button,
          (loading || pressed) && styles.buttonPressed,
        ]}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Signing out...' : 'Log out'}
        </Text>
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111827',
    borderColor: '#1f2937',
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  label: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  value: {
    color: '#f8fafc',
    fontSize: 16,
  },
  editLink: {
    color: '#38bdf8',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 6,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#dc2626',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
});
