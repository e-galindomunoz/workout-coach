import { Link } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppScreen } from './AppScreen';
import { createProfile, isSupabaseConfigured, supabase, supabaseConfigError } from '../lib/supabase';

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
      <View style={styles.formCard}>
        {mode === 'signup' ? (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              autoCapitalize="words"
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor="#64748b"
              style={styles.input}
              value={name}
            />
          </View>
        ) : null}

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#64748b"
            style={styles.input}
            value={email}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            autoCapitalize="none"
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor="#64748b"
            secureTextEntry
            style={styles.input}
            value={password}
          />
        </View>

        {mode === 'signup' ? (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Confirm password</Text>
            <TextInput
              autoCapitalize="none"
              onChangeText={setConfirmPassword}
              placeholder="Confirm password"
              placeholderTextColor="#64748b"
              secureTextEntry
              style={styles.input}
              value={confirmPassword}
            />
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {message ? <Text style={styles.messageText}>{message}</Text> : null}

        <Pressable
          accessibilityRole="button"
          disabled={loading}
          onPress={handleSubmit}
          style={({ pressed }) => [
            styles.primaryButton,
            (loading || pressed) && styles.primaryButtonPressed,
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#0f172a" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {mode === 'login' ? 'Log in' : 'Create account'}
            </Text>
          )}
        </Pressable>
      </View>

      <Link href={alternateHref} style={styles.secondaryLink}>
        {alternateLabel}
      </Link>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  formCard: {
    backgroundColor: '#111827',
    borderColor: '#1f2937',
    borderRadius: 16,
    borderWidth: 1,
    gap: 16,
    padding: 18,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#020617',
    borderColor: '#334155',
    borderRadius: 12,
    borderWidth: 1,
    color: '#f8fafc',
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 14,
    lineHeight: 20,
  },
  messageText: {
    color: '#86efac',
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#38bdf8',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  primaryButtonPressed: {
    opacity: 0.85,
  },
  primaryButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryLink: {
    color: '#38bdf8',
    fontSize: 15,
    fontWeight: '600',
  },
});
