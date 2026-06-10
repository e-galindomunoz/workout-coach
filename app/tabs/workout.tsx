import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { deleteWorkoutSession, getLatestBodyMetric, getRecentWorkoutSessions } from '../../lib/supabase';
import { getLatestWorkout, getWorkoutsThisWeekCount } from '../../lib/workouts';
import type { BodyMetric, WorkoutSession } from '../../types/supabase';

export default function WorkoutTabScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [latestMetric, setLatestMetric] = useState<BodyMetric | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [sessionsResult, metricResult] = await Promise.all([
      getRecentWorkoutSessions(12),
      getLatestBodyMetric(),
    ]);

    if (sessionsResult.error) {
      setError(sessionsResult.error.message);
      setSessions([]);
    } else {
      setSessions(sessionsResult.data ?? []);
    }

    if (metricResult.error) {
      setError(metricResult.error.message);
      setLatestMetric(null);
    } else {
      setLatestMetric(metricResult.data);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const workoutsThisWeek = useMemo(() => getWorkoutsThisWeekCount(sessions), [sessions]);
  const lastWorkout = useMemo(() => getLatestWorkout(sessions), [sessions]);

  function confirmDeleteWorkout(session: WorkoutSession) {
    Alert.alert(
      'Delete workout?',
      `Delete "${session.title}" and all of its logged sets?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void handleDeleteWorkout(session.id);
          },
        },
      ],
    );
  }

  async function handleDeleteWorkout(id: string) {
    setError(null);
    const result = await deleteWorkoutSession(id);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    await loadData();
  }

  return (
    <AppScreen
      title="Workout"
      description="Start a workout, review recent sessions, and track your weekly training pace."
    >
      <View style={styles.content}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/workout/new')}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
        >
          <Text style={styles.primaryButtonText}>Start Workout</Text>
        </Pressable>

        <View style={styles.statGrid}>
          <StatCard label="Workouts this week" value={`${workoutsThisWeek}`} />
          <StatCard
            label="Last workout"
            value={lastWorkout ? formatDate(lastWorkout.started_at) : 'None yet'}
          />
          <StatCard
            label="Latest body weight"
            value={latestMetric ? `${latestMetric.weight} lb` : 'No entries'}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent workout sessions</Text>

          {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color="#38bdf8" />
              <Text style={styles.loadingText}>Loading workouts...</Text>
            </View>
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : sessions.length === 0 ? (
            <Text style={styles.emptyText}>No workouts logged yet.</Text>
          ) : (
            sessions.map((session) => (
              <Pressable
                key={session.id}
                onPress={() => router.push(`/workout/${session.id}`)}
                style={({ pressed }) => [styles.sessionRow, pressed && styles.buttonPressed]}
              >
                <View style={styles.sessionMeta}>
                  <Text style={styles.sessionTitle}>{session.title}</Text>
                  <Text style={styles.sessionDetail}>
                    {formatDate(session.started_at)}
                    {session.duration_minutes ? ` · ${session.duration_minutes} min` : ''}
                  </Text>
                  {session.workout_type ? (
                    <Text style={styles.sessionDetail}>{session.workout_type}</Text>
                  ) : null}
                </View>
                <View style={styles.sessionActions}>
                  <Text style={styles.sessionLink}>View</Text>
                  <Pressable onPress={() => confirmDeleteWorkout(session)}>
                    <Text style={styles.deleteLink}>Delete</Text>
                  </Pressable>
                </View>
              </Pressable>
            ))
          )}
        </View>
      </View>
    </AppScreen>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingBottom: 40,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#38bdf8',
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  primaryButtonText: {
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.84,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: '#111827',
    borderColor: '#1f2937',
    borderRadius: 16,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: '47%',
    padding: 16,
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statValue: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 8,
  },
  card: {
    backgroundColor: '#111827',
    borderColor: '#1f2937',
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
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
  errorText: {
    color: '#fca5a5',
    fontSize: 14,
    lineHeight: 20,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  sessionRow: {
    alignItems: 'center',
    borderBottomColor: '#1f2937',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  sessionMeta: {
    flex: 1,
    gap: 4,
  },
  sessionTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  sessionDetail: {
    color: '#cbd5e1',
    fontSize: 14,
  },
  sessionLink: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '700',
  },
  sessionActions: {
    alignItems: 'flex-end',
    gap: 8,
    marginLeft: 12,
  },
  deleteLink: {
    color: '#fca5a5',
    fontSize: 13,
    fontWeight: '700',
  },
});
