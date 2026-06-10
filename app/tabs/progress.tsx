import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { getAllPersonalBests } from '../../lib/progression';
import { getAllExerciseLogs } from '../../lib/supabase';
import type { ExerciseLog, PersonalBestSummary } from '../../types/supabase';

export default function ProgressScreen() {
  const router = useRouter();
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await getAllExerciseLogs();

    if (result.error) {
      setError(result.error.message);
      setLogs([]);
      setLoading(false);
      return;
    }

    setLogs(result.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const personalBests = useMemo(() => getAllPersonalBests(logs), [logs]);

  return (
    <AppScreen
      title="Progress"
      description="Review personal bests, recent lift trends, and what your logs say about your next step."
    >
      <View style={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.heroValue}>{personalBests.length}</Text>
          <Text style={styles.heroLabel}>Tracked exercises with history</Text>
          <Text style={styles.heroHint}>
            Tap any exercise to inspect its best sets, recent sessions, and next recommendation.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Personal Bests</Text>

          {loading ? (
            <View style={styles.stateBlock}>
              <ActivityIndicator color="#38bdf8" />
              <Text style={styles.stateText}>Loading personal bests...</Text>
            </View>
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : personalBests.length === 0 ? (
            <Text style={styles.emptyText}>
              No exercise history yet. Finish a workout to populate personal bests.
            </Text>
          ) : (
            personalBests.map((item) => (
              <Pressable
                key={item.exerciseName}
                onPress={() =>
                  router.push({
                    pathname: '/progress/[exerciseName]',
                    params: { exerciseName: item.exerciseName },
                  })
                }
                style={({ pressed }) => [styles.exerciseCard, pressed && styles.buttonPressed]}
              >
                <View style={styles.exerciseHeader}>
                  <View style={styles.exerciseMeta}>
                    <Text style={styles.exerciseName}>{item.exerciseName}</Text>
                    <Text style={styles.exerciseSubtext}>
                      {item.muscleGroup ?? 'Muscle group not set'}
                    </Text>
                  </View>
                  <Text style={styles.linkText}>View</Text>
                </View>

                <View style={styles.statGrid}>
                  <MiniStat
                    label="Heaviest"
                    value={formatHeaviest(item)}
                  />
                  <MiniStat
                    label="Best est. 1RM"
                    value={formatEstimatedOneRepMax(item)}
                  />
                </View>

                <Text style={styles.detailLine}>Best set: {formatBestSet(item)}</Text>
                <Text style={styles.detailLine}>
                  Last performed: {formatDate(item.lastPerformedDate)}
                </Text>
              </Pressable>
            ))
          )}
        </View>
      </View>
    </AppScreen>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatLabel}>{label}</Text>
      <Text style={styles.miniStatValue}>{value}</Text>
    </View>
  );
}

function formatHeaviest(item: PersonalBestSummary) {
  if (!item.heaviestWeight.weight) {
    return 'No load yet';
  }

  if (item.heaviestWeight.reps) {
    return `${item.heaviestWeight.weight} lb x ${item.heaviestWeight.reps}`;
  }

  return `${item.heaviestWeight.weight} lb`;
}

function formatEstimatedOneRepMax(item: PersonalBestSummary) {
  if (!item.bestEstimatedOneRepMax.value) {
    return 'N/A';
  }

  return `${Math.round(item.bestEstimatedOneRepMax.value)} lb`;
}

function formatBestSet(item: PersonalBestSummary) {
  if (!item.bestEstimatedOneRepMax.weight || !item.bestEstimatedOneRepMax.reps) {
    return 'No working sets yet';
  }

  return `${item.bestEstimatedOneRepMax.weight} lb x ${item.bestEstimatedOneRepMax.reps}`;
}

function formatDate(value: string | null) {
  if (!value) {
    return 'Never';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#111827',
    borderColor: '#1f2937',
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  heroValue: {
    color: '#f8fafc',
    fontSize: 32,
    fontWeight: '800',
  },
  heroLabel: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '700',
  },
  heroHint: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 20,
  },
  sectionCard: {
    backgroundColor: '#111827',
    borderColor: '#1f2937',
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  stateBlock: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  stateText: {
    color: '#cbd5e1',
    fontSize: 14,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 14,
    lineHeight: 20,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 20,
  },
  exerciseCard: {
    backgroundColor: '#0b1220',
    borderColor: '#1f2937',
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginTop: 12,
    padding: 16,
  },
  buttonPressed: {
    opacity: 0.84,
  },
  exerciseHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  exerciseMeta: {
    flex: 1,
    gap: 4,
    marginRight: 12,
  },
  exerciseName: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
  },
  exerciseSubtext: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  linkText: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '700',
  },
  statGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  miniStat: {
    backgroundColor: '#111827',
    borderColor: '#334155',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    minHeight: 76,
    padding: 12,
  },
  miniStatLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  miniStatValue: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  detailLine: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
  },
});
