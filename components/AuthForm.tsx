import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { createProfile, isSupabaseConfigured, supabase, supabaseConfigError } from '../lib/supabase';
import { colors, fontSizes, fontWeights, radius, spacing } from '../lib/theme';

type AuthFormProps = {
  mode: 'login' | 'signup';
  alternateHref: '/auth/login' | '/auth/signup';
  alternateLabel: string;
};

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const FEATURES: Array<{ icon: IoniconName; label: string }> = [
  { icon: 'trophy-outline', label: 'PR Tracking' },
  { icon: 'trending-up-outline', label: 'Progression' },
  { icon: 'chatbubble-ellipses-outline', label: 'AI Coach' },
];

export function AuthForm({ mode, alternateHref, alternateLabel }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setMessage(null);

    if (!isSupabaseConfigured) {
      setError(supabaseConfigError);
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      return;
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInError) {
          setError(signInError.message);
          return;
        }

        setMessage('Signed in successfully.');
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { name: name.trim() || null },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data.session) {
        const profileResult = await createProfile({ name: name.trim() || null });
        if (profileResult.error) {
          setError(profileResult.error.message);
          return;
        }
        setMessage('Account created. Redirecting...');
        return;
      }

      setMessage('Account created. Check your email to confirm, then log in.');
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/auth/login');
    }
  }

  return (
    <View style={styles.root}>
      {/* Decorative orbs */}
      <View style={styles.orbA} />
      <View style={styles.orbB} />

      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.fill}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.inner}>

              {/* Back button — signup only */}
              {mode === 'signup' ? (
                <Pressable
                  onPress={goBack}
                  style={({ pressed }) => [styles.backButton, pressed && styles.backPressed]}
                >
                  <Ionicons name="arrow-back-outline" size={16} color={colors.accent} />
                  <Text style={styles.backText}>Log In</Text>
                </Pressable>
              ) : null}

              {/* Wordmark */}
              <View style={styles.wordmarkRow}>
                <Ionicons name="barbell-outline" size={15} color={colors.accent} />
                <Text style={styles.wordmark}>IRONLINE</Text>
              </View>

              {/* Hero — mode specific */}
              {mode === 'login' ? (
                <View style={styles.hero}>
                  <Text style={styles.heroHeading}>Track every lift.</Text>
                  <Text style={styles.heroSub}>Chase your next mark.</Text>
                  <View style={styles.chips}>
                    {FEATURES.map((f) => (
                      <View key={f.label} style={styles.chip}>
                        <Ionicons name={f.icon} size={12} color={colors.accent} />
                        <Text style={styles.chipLabel}>{f.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <View style={styles.hero}>
                  <Text style={styles.heroHeading}>
                    Build your{'\n'}training history.
                  </Text>
                  <Text style={styles.heroSub}>
                    Log sets, track PRs, and get smarter guidance with every session.
                  </Text>
                </View>
              )}

              {/* Form card */}
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>
                  {mode === 'login' ? 'Log In' : 'Create Account'}
                </Text>

                <View style={styles.fields}>
                  {mode === 'signup' ? (
                    <Input
                      autoCapitalize="words"
                      label="Name"
                      onChangeText={setName}
                      placeholder="Your name"
                      value={name}
                    />
                  ) : null}

                  <Input
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    label="Email"
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    value={email}
                  />

                  <Input
                    autoCapitalize="none"
                    label="Password"
                    onChangeText={setPassword}
                    placeholder={mode === 'login' ? 'Password' : 'At least 6 characters'}
                    secureTextEntry
                    value={password}
                  />

                  {mode === 'signup' ? (
                    <Input
                      autoCapitalize="none"
                      label="Confirm password"
                      onChangeText={setConfirmPassword}
                      placeholder="Confirm password"
                      secureTextEntry
                      value={confirmPassword}
                    />
                  ) : null}
                </View>

                {error ? (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle" size={14} color={colors.danger} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                {message ? (
                  <View style={styles.successBanner}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                    <Text style={styles.successText}>{message}</Text>
                  </View>
                ) : null}

                <Button
                  label={mode === 'login' ? 'Log In' : 'Create Account'}
                  loading={loading}
                  onPress={() => void handleSubmit()}
                  size="lg"
                />
              </View>

              <Link href={alternateHref} style={styles.altLink}>
                {alternateLabel}
              </Link>

              {mode === 'login' ? (
                <Text style={styles.tagline}>
                  Built around real workout history.{'\n'}Not random plans.
                </Text>
              ) : null}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.background,
    flex: 1,
  },
  fill: {
    flex: 1,
  },

  // Orbs
  orbA: {
    backgroundColor: '#2A3B18',
    borderRadius: 300,
    height: 360,
    opacity: 0.22,
    position: 'absolute',
    right: -110,
    top: -90,
    width: 360,
  },
  orbB: {
    backgroundColor: '#1A2810',
    borderRadius: 300,
    bottom: -90,
    height: 280,
    left: -80,
    opacity: 0.30,
    position: 'absolute',
    width: 280,
  },

  // Layout
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  inner: {
    alignSelf: 'center',
    gap: spacing.xl,
    maxWidth: 440,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    width: '100%',
  },

  // Back button (signup only)
  backButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: -spacing.sm,
  },
  backPressed: {
    opacity: 0.65,
  },
  backText: {
    color: colors.accent,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.heavy,
  },

  // Wordmark
  wordmarkRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  wordmark: {
    color: colors.accent,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.heavy,
    letterSpacing: 3.5,
  },

  // Hero
  hero: {
    gap: spacing.md,
  },
  heroHeading: {
    color: colors.text,
    fontSize: 36,
    fontWeight: fontWeights.heavy,
    letterSpacing: -1.0,
    lineHeight: 42,
  },
  heroSub: {
    color: colors.textSoft,
    fontSize: fontSizes.md,
    lineHeight: 22,
  },

  // Feature chips (login hero)
  chips: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: colors.accentDim,
    borderColor: colors.accentBorder,
    borderRadius: radius.pill,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: 6,
  },
  chipLabel: {
    color: colors.accent,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.heavy,
    letterSpacing: 0.3,
  },

  // Form card
  formCard: {
    backgroundColor: colors.glassCard,
    borderColor: colors.accentBorder,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.xl,
  },
  formTitle: {
    color: colors.text,
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.heavy,
    letterSpacing: -0.3,
  },
  fields: {
    gap: spacing.md,
  },

  // Error banner
  errorBanner: {
    alignItems: 'flex-start',
    backgroundColor: colors.dangerSurface,
    borderColor: 'rgba(224, 108, 117, 0.28)',
    borderRadius: radius.xs,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.sm,
  },
  errorText: {
    color: colors.danger,
    flex: 1,
    fontSize: fontSizes.sm,
    lineHeight: 18,
  },

  // Success banner
  successBanner: {
    alignItems: 'flex-start',
    backgroundColor: colors.successSurface,
    borderColor: 'rgba(183, 214, 106, 0.28)',
    borderRadius: radius.xs,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.sm,
  },
  successText: {
    color: colors.success,
    flex: 1,
    fontSize: fontSizes.sm,
    lineHeight: 18,
  },

  // Alternate link
  altLink: {
    color: colors.accent,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    textAlign: 'center',
  },

  // Bottom tagline (login only)
  tagline: {
    color: colors.textSoft,
    fontSize: fontSizes.sm,
    lineHeight: 20,
    opacity: 0.65,
    textAlign: 'center',
  },
});
