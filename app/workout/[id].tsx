import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { getExercisePrHighlights } from '../../lib/progression';
import {
  deleteWorkoutSession,
  getExerciseHistory,
  getExerciseLogsBySession,
  getWorkoutSessionById,
} from '../../lib/supabase';
import { calculateTotalVolume, countWorkoutSets, groupExerciseLogs } from '../../lib/workouts';
import type { ExerciseLog, WorkoutSession } from '../../types/supabase';

export default function WorkoutSummaryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [prHighlights, setPrHighlights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSummary() {
      if (!id) {
        setError('Workout session not found.');
        setLoading(false);
        return;
      }

      setLoading(true);
      const [sessionResult, logsResult] = await Promise.all([
        getWorkoutSessionById(id),
        getExerciseLogsBySession(id),
      ]);

      if (sessionResult.error) {
        setError(sessionResult.error.message);
      } else {
        setSession(sessionResult.data);
      }

      if (logsResult.error) {
        setError(logsResult.error.message);
        setLogs([]);
      } else {
        setLogs(logsResult.data ?? []);
      }

      if (!logsResult.error && logsResult.data) {
        const grouped = groupExerciseLogs(logsResult.data);
        const highlightResults = await Promise.all(
          grouped.map(async (group) => {
            const historyResult = await getExerciseHistory(group.exerciseName, 60);

            if (historyResult.error) {
              return [];
            }

            const previousLogs = (historyResult.data ?? []).filter(
              (log) => log.workout_session_id !== id,
            );

            return getExercisePrHighlights(group.exerciseName, group.logs, previousLogs);
          }),
        );

        setPrHighlights(Array.from(new Set(highlightResults.flat())));
      } else {
        setPrHighlights([]);
      }

      setLoading(false);
    }

    void loadSummary();
  }, [id]);

  const groupedLogs = useMemo(() => groupExerciseLogs(logs), [logs]);
  const totalVolume = useMemo(() => calculateTotalVolume(logs), [logs]);

  function confirmDeleteWorkout() {
    if (!session) {
      return;
    }

    Alert.alert(
      'Delete workout?',
      `Delete "${session.title}" and all of its logged sets?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void handleDeleteWorkout();
          },
        },
      ],
    );
  }

  async function handleDeleteWorkout() {
    if (!session) {
      return;
    }

    const result = await deleteWorkoutSession(session.id);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    router.replace('/tabs/workout');
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Workout Summary',
          headerRight: () =>
            session ? (
              <Pressable onPress={confirmDeleteWorkout}>
                <Text style={styles.headerDelete}>Delete</Text>
              </Pressable>
            ) : null,
        }}
      />
      <AppScreen
        title={session?.title ?? 'Workout Summary'}
        description="Review the workout you just completed."
        scrollEnabled={false}
      >
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color="#38bdf8" />
            <Text style={styles.centerText}>Loading workout summary...</Text>
          </View>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : !session ? (
          <Text style={styles.centerText}>Workout session not found.</Text>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.summaryGrid}>
              <StatCard label="Duration" value={`${session.duration_minutes ?? 0} min`} />
              <StatCard label="Exercises" value={`${groupedLogs.length}`} />
              <StatCard label="Total sets" value={`${countWorkoutSets(groupedLogs.map((group) => ({ sets: group.logs })))}`} />
              <StatCard
                label="Total volume"
                value={totalVolume > 0 ? `${Math.round(totalVolume)} lb` : 'N/A'}
              />
            </View>

            <View style={styles.notesCard}>
              <Text style={styles.cardTitle}>PRs from this workout</Text>
              {prHighlights.length === 0 ? (
                <Text style={styles.notesText}>No new PRs were detected from this session.</Text>
              ) : (
                prHighlights.map((highlight) => (
                  <View key={highlight} style={styles.prRow}>
                    <View style={styles.prDot} />
                    <Text style={styles.prText}>{highlight}</Text>
                  </View>
                ))
              )}
            </View>

            {session.notes ? (
              <View style={styles.notesCard}>
                <Text style={styles.cardTitle}>Session notes</Text>
                <Text style={styles.notesText}>{session.notes}</Text>
              </View>
            ) : null}

            <View style={styles.exerciseList}>
              {groupedLogs.map((group) => (
                <View key={group.exerciseName} style={styles.exerciseCard}>
                  <Text style={styles.exerciseTitle}>{group.exerciseName}</Text>
                  {group.logs.map((log) => (
                    <View key={log.id} style={styles.setRow}>
                      <Text style={styles.setText}>
                        Set {log.set_number}: {log.weight ?? '-'} lb x {log.reps ?? '-'} reps
                        {typeof log.rpe === 'number' ? ` · RPE ${log.rpe}` : ''}
                      </Text>
                      {log.pain_flag ? <Text style={styles.painFlag}>Pain flagged</Text> : null}
                      {log.notes ? <Text style={styles.setNote}>{log.notes}</Text> : null}
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </AppScreen>
    </>
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

const styles = StyleSheet.create({
  headerDelete: {
    color: '#fca5a5',
    fontSize: 15,
    fontWeight: '700',
  },
  centerState: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 24,
  },
  centerText: {
    color: '#cbd5e1',
    fontSize: 15,
    textAlign: 'center',
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 14,
    lineHeight: 20,
  },
  content: {
    gap: 16,
    paddingBottom: 40,
  },
  summaryGrid: {
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
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
  },
  notesCard: {
    backgroundColor: '#111827',
    borderColor: '#1f2937',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  notesText: {
    color: '#cbd5e1',
    fontSize: 15,
    lineHeight: 22,
  },
  prRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  prDot: {
    backgroundColor: '#38bdf8',
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  prText: {
    color: '#e2e8f0',
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  exerciseList: {
    gap: 12,
  },
  exerciseCard: {
    backgroundColor: '#111827',
    borderColor: '#1f2937',
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  exerciseTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
  },
  setRow: {
    gap: 4,
  },
  setText: {
    color: '#cbd5e1',
    fontSize: 15,
  },
  painFlag: {
    color: '#fca5a5',
    fontSize: 13,
    fontWeight: '700',
  },
  setNote: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 20,
  },
});
