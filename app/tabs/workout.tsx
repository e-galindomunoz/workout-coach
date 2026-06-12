import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { LoadingState } from '../../components/ui/LoadingState';
import { Pill } from '../../components/ui/Pill';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { StatCard } from '../../components/ui/StatCard';
import { deleteWorkoutSession, getLatestBodyMetric, getRecentWorkoutSessions } from '../../lib/supabase';
import { colors, fontSizes, fontWeights, radius, spacing } from '../../lib/theme';
import { getLatestWorkout, getWorkoutsThisWeekCount } from '../../lib/workouts';
import type { BodyMetric, WorkoutSession } from '../../types/supabase';

export default function WorkoutTabScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [latestMetric, setLatestMetric] = useState<BodyMetric | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

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
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const workoutsThisWeek = useMemo(() => getWorkoutsThisWeekCount(sessions), [sessions]);
  const lastWorkout = useMemo(() => getLatestWorkout(sessions), [sessions]);

  function confirmDeleteWorkout(session: WorkoutSession) {
    Alert.alert(
      'Delete workout?',
      `Delete "${session.title}" and all its logged sets?`,
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void handleDeleteWorkout(session.id),
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
    await loadData(true);
  }

  return (
    <AppScreen
      title="Workout"
      description="Log a session, track your history, and keep your momentum going."
      refreshing={refreshing}
      onRefresh={() => void loadData(true)}
    >
      {loading ? (
        <LoadingState message="Loading workouts..." />
      ) : (
        <View style={styles.content}>
          {error ? <ErrorState message={error} /> : null}

          {/* Start Workout — primary CTA */}
          <Button
            label="Start New Workout"
            onPress={() => router.push('/workout/new')}
            size="lg"
          />

          <View style={styles.statRow}>
            <StatCard
              label="This week"
              value={`${workoutsThisWeek}`}
              caption="Sessions trained"
              accent
              style={styles.statFlex}
            />
            <StatCard
              label="Last session"
              value={lastWorkout ? formatDate(lastWorkout.started_at) : 'None yet'}
              caption={lastWorkout?.title ?? 'Start your first session'}
              style={styles.statFlex}
            />
          </View>
          <StatCard
            label="Body weight"
            value={latestMetric ? `${latestMetric.weight} lb` : 'Not logged'}
            caption={latestMetric ? `Logged ${formatDate(latestMetric.logged_at)}` : 'Log on Dashboard'}
          />

          <Card>
            <SectionHeader
              title="Session history"
              subtitle="Tap to view details."
            />

            {sessions.length === 0 ? (
              <EmptyState
                title="No sessions yet"
                description="Start your first workout to build history, PRs, and progression recommendations."
                action="Start Now"
                onPressAction={() => router.push('/workout/new')}
                icon="🏋️"
              />
            ) : (
              sessions.map((session) => (
                <Pressable
                  key={session.id}
                  onPress={() => router.push(`/workout/${session.id}`)}
                  style={({ pressed }) => [styles.sessionRow, pressed && styles.rowPressed]}
                >
                  <View style={styles.sessionMeta}>
                    <View style={styles.sessionHeading}>
                      <Text style={styles.sessionTitle}>{session.title}</Text>
                      {session.workout_type ? (
                        <Pill label={session.workout_type} />
                      ) : null}
                    </View>
                    <Text style={styles.sessionDetail}>
                      {formatDate(session.started_at)}
                      {session.duration_minutes ? ` · ${session.duration_minutes} min` : ''}
                    </Text>
                  </View>
                  <View style={styles.sessionActions}>
                    <Pressable
                      onPress={() => router.push(`/workout/${session.id}`)}
                      style={({ pressed }) => [styles.viewButton, pressed && styles.actionPressed]}
                      hitSlop={8}
                    >
                      <Ionicons name="chevron-forward" size={18} color={colors.accent} />
                    </Pressable>
                    <Pressable
                      onPress={() => confirmDeleteWorkout(session)}
                      style={({ pressed }) => [styles.deleteButton, pressed && styles.actionPressed]}
                      hitSlop={8}
                    >
                      <Ionicons name="trash-outline" size={15} color={colors.textSoft} />
                    </Pressable>
                  </View>
                </Pressable>
              ))
            )}
          </Card>
        </View>
      )}
    </AppScreen>
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
    gap: spacing.lg,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statFlex: {
    flex: 1,
  },
  sessionRow: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    paddingTop: spacing.md,
  },
  rowPressed: {
    opacity: 0.78,
  },
  sessionMeta: {
    flex: 1,
    gap: 5,
  },
  sessionHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sessionTitle: {
    color: colors.text,
    flexShrink: 1,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.heavy,
  },
  sessionDetail: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
  },
  sessionActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  viewButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAccent,
    borderColor: colors.accentBorder,
    borderRadius: radius.xs,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  deleteButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.xs,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  actionPressed: {
    opacity: 0.62,
  },
});
