import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Input } from '../../components/ui/Input';
import { LoadingState } from '../../components/ui/LoadingState';
import { Pill } from '../../components/ui/Pill';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { StatCard } from '../../components/ui/StatCard';
import { getAllPersonalBests, getExerciseSessionVolume } from '../../lib/progression';
import { getAllExerciseLogs, getBodyMetrics, getRecentWorkoutSessions } from '../../lib/supabase';
import { colors, fontSizes, radius, spacing } from '../../lib/theme';
import { getWorkoutsThisWeekCount } from '../../lib/workouts';
import type { BodyMetric, ExerciseLog, PersonalBestSummary, WorkoutSession } from '../../types/supabase';

export default function ProgressScreen() {
  const router = useRouter();
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [search, setSearch] = useState('');
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

    const [logsResult, metricsResult, sessionsResult] = await Promise.all([
      getAllExerciseLogs(),
      getBodyMetrics(),
      getRecentWorkoutSessions(24),
    ]);

    if (logsResult.error) {
      setError(logsResult.error.message);
      setLogs([]);
    } else {
      setLogs(logsResult.data ?? []);
    }

    if (metricsResult.error) {
      setError(metricsResult.error.message);
      setMetrics([]);
    } else {
      setMetrics(metricsResult.data ?? []);
    }

    if (sessionsResult.error) {
      setError(sessionsResult.error.message);
      setSessions([]);
    } else {
      setSessions(sessionsResult.data ?? []);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const personalBests = useMemo(() => getAllPersonalBests(logs), [logs]);
  const filteredBests = useMemo(() => {
    if (!search.trim()) {
      return personalBests;
    }

    const query = search.trim().toLowerCase();
    return personalBests.filter((item) => item.exerciseName.toLowerCase().includes(query));
  }, [personalBests, search]);
  const workoutsThisWeek = useMemo(() => getWorkoutsThisWeekCount(sessions), [sessions]);
  const weightDelta = metrics.length >= 2 ? metrics[0].weight - metrics[1].weight : null;
  const weeklyConsistency = useMemo(() => {
    const counts = [0, 0, 0, 0];
    const now = new Date();

    sessions.forEach((session) => {
      const diffMs = now.getTime() - new Date(session.started_at).getTime();
      const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));

      if (diffWeeks >= 0 && diffWeeks < 4) {
        counts[3 - diffWeeks] += 1;
      }
    });

    return counts;
  }, [sessions]);
  const maxWeekCount = Math.max(...weeklyConsistency, 1);

  return (
    <AppScreen
      title="Progress"
      description="Personal bests, bodyweight trend, and training consistency."
      refreshing={refreshing}
      onRefresh={() => void loadData(true)}
    >
      {loading ? (
        <LoadingState message="Loading your progress..." />
      ) : (
        <View style={styles.content}>
          {error ? <ErrorState message={error} /> : null}

          <View style={styles.statRow}>
            <StatCard
              label="Tracked lifts"
              value={`${personalBests.length}`}
              caption="Exercises with history"
              accent
              style={styles.statFlex}
            />
            <StatCard
              label="This week"
              value={`${workoutsThisWeek}`}
              caption="Sessions trained"
              style={styles.statFlex}
            />
          </View>

          <Card>
            <SectionHeader title="Weight trend" subtitle="Your latest bodyweight movement." />
            {metrics.length === 0 ? (
              <EmptyState
                title="No weight data yet"
                description="Log bodyweight on the Dashboard to see your trend here."
              />
            ) : (
              <>
                <Text style={styles.trendNumber}>{metrics[0].weight} lb</Text>
                <Text style={styles.trendLabel}>
                  Latest · {formatDate(metrics[0].logged_at)}
                </Text>
                <Text style={styles.trendDetail}>
                  {weightDelta === null
                    ? 'Add one more check-in to see your recent change.'
                    : `Recent change: ${weightDelta > 0 ? '+' : ''}${weightDelta.toFixed(1)} lb vs previous entry.`}
                </Text>
              </>
            )}
          </Card>

          <Card>
            <SectionHeader title="Training consistency" subtitle="Sessions per week over the last four weeks." />
            <View style={styles.consistencyList}>
              {weeklyConsistency.map((count, index) => (
                <View key={`week-${index}`} style={styles.consistencyRow}>
                  <Text style={styles.consistencyLabel}>
                    {index === 3 ? 'This wk' : `${3 - index} wks ago`}
                  </Text>
                  <View style={styles.consistencyBarWrap}>
                    <ProgressBar value={(count / maxWeekCount) * 100} />
                  </View>
                  <Text style={styles.consistencyValue}>{count}</Text>
                </View>
              ))}
            </View>
          </Card>

          <Card>
            <SectionHeader title="Personal bests" subtitle="Tap any lift for full stats and your next target." />
            <Input
              label="Search exercises"
              onChangeText={setSearch}
              placeholder="Deadlift, bench press, squat..."
              value={search}
            />

            {filteredBests.length === 0 ? (
              <EmptyState
                title={personalBests.length === 0 ? 'No exercise history yet' : 'No matching lifts'}
                description={
                  personalBests.length === 0
                    ? 'Log your first workout to start building personal bests.'
                    : 'Try a different search term.'
                }
              />
            ) : (
              filteredBests.map((item) => (
                <Pressable
                  key={item.exerciseName}
                  onPress={() =>
                    router.push({
                      pathname: '/progress/[exerciseName]',
                      params: { exerciseName: item.exerciseName },
                    })
                  }
                  style={({ pressed }) => [styles.exerciseCard, pressed && styles.rowPressed]}
                >
                  <View style={styles.exerciseHeader}>
                    <View style={styles.exerciseMeta}>
                      <Text style={styles.exerciseName}>{item.exerciseName}</Text>
                      <Text style={styles.exerciseSubtext}>
                        {item.muscleGroup ?? 'Muscle group not set'}
                      </Text>
                    </View>
                    <Pill label={formatTrend(item)} tone={getTrendTone(item)} />
                  </View>

                  <View style={styles.bestRow}>
                    <Text style={styles.bestLabel}>Heaviest</Text>
                    <Text style={styles.bestValue}>{formatHeaviest(item)}</Text>
                  </View>
                  <View style={styles.bestRow}>
                    <Text style={styles.bestLabel}>Est. 1RM</Text>
                    <Text style={styles.bestValue}>{formatEstimatedOneRepMax(item)}</Text>
                  </View>
                  <View style={styles.bestRow}>
                    <Text style={styles.bestLabel}>Best volume</Text>
                    <Text style={styles.bestValue}>{formatVolume(item)}</Text>
                  </View>
                  <Text style={styles.exerciseFooter}>Last performed {formatDate(item.lastPerformedDate ?? new Date().toISOString())}</Text>
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
    year: 'numeric',
  }).format(new Date(value));
}

function formatTrend(item: PersonalBestSummary) {
  if (item.recentTrend === 'insufficient_data') {
    return 'Needs data';
  }

  if (item.recentTrend === 'up') {
    return 'Trending up';
  }

  if (item.recentTrend === 'down') {
    return 'Trending down';
  }

  return 'Stable';
}

function getTrendTone(item: PersonalBestSummary) {
  if (item.recentTrend === 'up') {
    return 'success' as const;
  }

  if (item.recentTrend === 'down') {
    return 'warning' as const;
  }

  return 'default' as const;
}

function formatHeaviest(item: PersonalBestSummary) {
  if (!item.heaviestWeight.weight) {
    return 'No load yet';
  }

  return `${item.heaviestWeight.weight} lb${item.heaviestWeight.reps ? ` × ${item.heaviestWeight.reps}` : ''}`;
}

function formatEstimatedOneRepMax(item: PersonalBestSummary) {
  if (!item.bestEstimatedOneRepMax.value) {
    return 'N/A';
  }

  return `${Math.round(item.bestEstimatedOneRepMax.value)} lb`;
}

function formatVolume(item: PersonalBestSummary) {
  if (!item.highestSessionVolume.volume) {
    return 'N/A';
  }

  return `${Math.round(item.highestSessionVolume.volume)} lb`;
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: 100,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statFlex: {
    flex: 1,
  },
  trendNumber: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  trendLabel: {
    color: colors.accent,
    fontSize: fontSizes.sm,
    fontWeight: '700',
    marginTop: 4,
  },
  trendDetail: {
    color: colors.textMuted,
    fontSize: fontSizes.md,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  consistencyList: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  consistencyRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  consistencyLabel: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    width: 58,
  },
  consistencyBarWrap: {
    flex: 1,
  },
  consistencyValue: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: '800',
    textAlign: 'right',
    width: 20,
  },
  exerciseCard: {
    backgroundColor: colors.surfaceCard,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.lg,
  },
  rowPressed: {
    opacity: 0.82,
  },
  exerciseHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  exerciseMeta: {
    flex: 1,
    gap: 4,
  },
  exerciseName: {
    color: colors.text,
    fontSize: fontSizes.xl,
    fontWeight: '800',
  },
  exerciseSubtext: {
    color: colors.textSoft,
    fontSize: fontSizes.sm,
    fontWeight: '700',
  },
  bestRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bestLabel: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
  },
  bestValue: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: '800',
  },
  exerciseFooter: {
    color: colors.textSoft,
    fontSize: fontSizes.sm,
    marginTop: spacing.xs,
  },
});
