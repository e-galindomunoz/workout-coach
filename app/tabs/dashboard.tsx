import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import {
  addBodyMetric,
  deleteBodyMetric,
  getBodyMetrics,
  getLatestBodyMetric,
} from '../../lib/supabase';
import type { BodyMetric } from '../../types/supabase';

export default function DashboardScreen() {
  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');
  const [notes, setNotes] = useState('');
  const [latestMetric, setLatestMetric] = useState<BodyMetric | null>(null);
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [latestResult, metricsResult] = await Promise.all([
      getLatestBodyMetric(),
      getBodyMetrics(),
    ]);

    if (latestResult.error) {
      setError(latestResult.error.message);
    } else {
      setLatestMetric(latestResult.data);
    }

    if (metricsResult.error) {
      setError(metricsResult.error.message);
      setMetrics([]);
    } else {
      setMetrics(metricsResult.data ?? []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  async function handleSave() {
    setError(null);

    const parsedWeight = Number(weight);
    const parsedWaist = waist.trim() ? Number(waist) : null;

    if (!(parsedWeight > 0)) {
      setError('Weight must be a positive number.');
      return;
    }

    if (parsedWaist !== null && !(parsedWaist > 0)) {
      setError('Waist must be a positive number when provided.');
      return;
    }

    setSaving(true);

    const result = await addBodyMetric({
      weight: parsedWeight,
      waist: parsedWaist,
      notes: notes.trim() || null,
    });

    setSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setWeight('');
    setWaist('');
    setNotes('');
    await loadMetrics();
  }

  async function handleDelete(id: string) {
    setError(null);

    const result = await deleteBodyMetric(id);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    await loadMetrics();
  }

  return (
    <AppScreen
      title="Dashboard"
      description="Track your latest body weight and keep a simple recent log."
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.formContainer}
      >
        <View style={styles.summaryCard}>
          <Text style={styles.cardLabel}>Latest body weight</Text>
          <Text style={styles.weightValue}>
            {latestMetric ? `${latestMetric.weight} lb` : 'No entries yet'}
          </Text>
          <Text style={styles.cardHint}>
            {latestMetric
              ? `Logged ${formatDate(latestMetric.logged_at)}`
              : 'Add your first weight entry below.'}
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Log Weight</Text>

          <InputField
            keyboardType="decimal-pad"
            label="Weight"
            onChangeText={setWeight}
            placeholder="185"
            value={weight}
          />

          <InputField
            keyboardType="decimal-pad"
            label="Waist (optional)"
            onChangeText={setWaist}
            placeholder="34"
            value={waist}
          />

          <InputField
            label="Notes (optional)"
            multiline
            onChangeText={setNotes}
            placeholder="Morning weigh-in, after workout, etc."
            value={notes}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={handleSave}
            style={({ pressed }) => [
              styles.primaryButton,
              (saving || pressed) && styles.buttonPressed,
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#0f172a" />
            ) : (
              <Text style={styles.primaryButtonText}>Log Weight</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.listCard}>
          <Text style={styles.formTitle}>Recent entries</Text>

          {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color="#38bdf8" />
              <Text style={styles.loadingText}>Loading body metrics...</Text>
            </View>
          ) : (
            <FlatList
              data={metrics}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.metricRow}>
                  <View style={styles.metricMeta}>
                    <Text style={styles.metricWeight}>{item.weight} lb</Text>
                    <Text style={styles.metricDetail}>
                      {item.waist ? `Waist ${item.waist}` : 'No waist logged'}
                    </Text>
                    <Text style={styles.metricDetail}>
                      {formatDate(item.logged_at)}
                    </Text>
                    {item.notes ? (
                      <Text style={styles.metricNotes}>{item.notes}</Text>
                    ) : null}
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void handleDelete(item.id)}
                    style={({ pressed }) => [
                      styles.deleteButton,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </Pressable>
                </View>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No weight entries yet.</Text>
              }
              scrollEnabled={false}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

function InputField({
  label,
  multiline = false,
  ...props
}: {
  label: string;
  multiline?: boolean;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'decimal-pad';
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        multiline={multiline}
        placeholderTextColor="#64748b"
        style={[styles.input, multiline && styles.inputMultiline]}
        textAlignVertical={multiline ? 'top' : 'center'}
        {...props}
      />
    </View>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

const styles = StyleSheet.create({
  formContainer: {
    gap: 16,
  },
  summaryCard: {
    backgroundColor: '#111827',
    borderColor: '#1f2937',
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  cardLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  weightValue: {
    color: '#f8fafc',
    fontSize: 34,
    fontWeight: '700',
  },
  cardHint: {
    color: '#cbd5e1',
    fontSize: 15,
  },
  formCard: {
    backgroundColor: '#111827',
    borderColor: '#1f2937',
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  listCard: {
    backgroundColor: '#111827',
    borderColor: '#1f2937',
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  formTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
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
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  inputMultiline: {
    minHeight: 96,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#38bdf8',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.84,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 14,
    lineHeight: 20,
  },
  loadingState: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  loadingText: {
    color: '#cbd5e1',
    fontSize: 14,
  },
  metricRow: {
    alignItems: 'flex-start',
    borderBottomColor: '#1f2937',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  metricMeta: {
    flex: 1,
    gap: 4,
  },
  metricWeight: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
  },
  metricDetail: {
    color: '#cbd5e1',
    fontSize: 14,
  },
  metricNotes: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  deleteButton: {
    backgroundColor: '#7f1d1d',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  deleteButtonText: {
    color: '#fecaca',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
    paddingVertical: 8,
  },
});
