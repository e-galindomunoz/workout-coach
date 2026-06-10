import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from './AppScreen';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { ErrorState } from './ui/ErrorState';
import { Input } from './ui/Input';
import { Pill } from './ui/Pill';
import { createProfile, isSupabaseConfigured, supabase, supabaseConfigError } from '../lib/supabase';
import { colors, fontSizes, spacing } from '../lib/theme';

type AuthFormProps = {
  mode: 'login' | 'signup';
  title: string;
  description: string;
  alternateHref: '/auth/login' | '/auth/signup';
  alternateLabel: string;
};

export function AuthForm({
  mode,
  title,
  description,
  alternateHref,
  alternateLabel,
}: AuthFormProps) {
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
          data: {
            name: name.trim() || null,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data.session) {
        const profileResult = await createProfile({
          name: name.trim() || null,
        });

        if (profileResult.error) {
          setError(profileResult.error.message);
          return;
        }

        setMessage('Account created. Redirecting to the app...');
        return;
      }

      setMessage('Account created. Check your email to confirm your account, then log in.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppScreen title={title} description={description}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <Card accent style={styles.heroCard}>
          <Pill label={mode === 'login' ? 'Welcome back' : 'New account'} tone="accent" />
          <Text style={styles.heroTitle}>
            {mode === 'login'
              ? 'Open your training history and pick up where you left off.'
              : 'Create the account that will hold your workouts, PRs, and progression.'}
          </Text>
          <Text style={styles.heroText}>
            Phase 1 is fully manual and deterministic. Your data stays clean and drives every stat in the app.
          </Text>
        </Card>

        <Card style={styles.formCard}>
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
            placeholder="Password"
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

          {error ? <ErrorState message={error} /> : null}
          {message ? (
            <View style={styles.messageCard}>
              <Pill label="Success" tone="success" />
              <Text style={styles.messageText}>{message}</Text>
            </View>
          ) : null}

          <Button
            label={mode === 'login' ? 'Log in' : 'Create account'}
            loading={loading}
            onPress={() => void handleSubmit()}
          />
        </Card>

        <Link href={alternateHref} style={styles.secondaryLink}>
          {alternateLabel}
        </Link>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  heroCard: {
    gap: spacing.md,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
  },
  heroText: {
    color: colors.textMuted,
    fontSize: fontSizes.md,
    lineHeight: 22,
  },
  formCard: {
    gap: spacing.lg,
  },
  messageCard: {
    gap: spacing.sm,
  },
  messageText: {
    color: colors.success,
    fontSize: fontSizes.md,
    lineHeight: 22,
  },
  secondaryLink: {
    color: colors.accent,
    fontSize: fontSizes.md,
    fontWeight: '700',
    paddingBottom: spacing.sm,
    textAlign: 'center',
  },
});
