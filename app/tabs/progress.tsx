import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { GlassCard } from '../../components/ui/GlassCard';
import { Input } from '../../components/ui/Input';
import { LoadingState } from '../../components/ui/LoadingState';
import { Pill } from '../../components/ui/Pill';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { StatCard } from '../../components/ui/StatCard';
import { getAllPersonalBests, getExerciseSessionVolume } from '../../lib/progression';
import { getAllExerciseLogs, getBodyMetrics, getRecentWorkoutSessions } from '../../lib/supabase';
import { colors, fontSizes, fontWeights, radius, spacing } from '../../lib/theme';
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
    if (!search.trim()) return personalBests;
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
              caption="With logged history"
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

          {/* Weight trend */}
          <GlassCard>
            <SectionHeader title="Bodyweight Trend" subtitle="Latest weight and recent movement." />
            {metrics.length === 0 ? (
              <EmptyState
                title="No weight data yet"
                description="Log bodyweight on the Dashboard to see your trend here."
                icon="⚖️"
              />
            ) : (
              <>
                <Text style={styles.trendNumber}>{metrics[0].weight} lb</Text>
                <Text style={styles.trendDate}>
                  Latest · {formatDate(metrics[0].logged_at)}
                </Text>
                {weightDelta !== null ? (
                  <View style={styles.trendDeltaRow}>
                    <Text style={[
                      styles.trendDelta,
                      weightDelta > 0 && styles.trendUp,
                      weightDelta < 0 && styles.trendDown,
                    ]}>
                      {weightDelta > 0 ? '+' : ''}{weightDelta.toFixed(1)} lb
                    </Text>
                    <Text style={styles.trendDeltaLabel}> vs previous entry</Text>
                  </View>
                ) : (
                  <Text style={styles.trendDetail}>Log another entry to see your change.</Text>
                )}
              </>
            )}
          </GlassCard>

          {/* Training consistency */}
          <Card>
            <SectionHeader title="Training Consistency" subtitle="Sessions per week, last four weeks." />
            <View style={styles.consistencyList}>
              {weeklyConsistency.map((count, index) => (
                <View key={`week-${index}`} style={styles.consistencyRow}>
                  <Text style={styles.consistencyLabel}>
                    {index === 3 ? 'This wk' : `${3 - index} wks ago`}
                  </Text>
                  <View style={styles.consistencyBarWrap}>
                    <ProgressBar
                      value={(count / maxWeekCount) * 100}
                      tone={count >= 3 ? 'accent' : count >= 1 ? 'accent' : 'accent'}
                    />
                  </View>
                  <Text style={styles.consistencyValue}>{count}</Text>
                </View>
              ))}
            </View>
          </Card>

          {/* Personal bests */}
          <Card>
            <SectionHeader
              title="Personal Bests"
              subtitle="Tap any lift for full stats and your next target."
            />
            <Input
              label="Search lifts"
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
                icon={personalBests.length === 0 ? '🏆' : '🔍'}
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
                      {item.muscleGroup ? (
                        <Text style={styles.exerciseSubtext}>{item.muscleGroup}</Text>
                      ) : null}
                    </View>
                    <Pill label={formatTrend(item)} tone={getTrendTone(item)} />
                  </View>

                  <View style={styles.bestGrid}>
                    <View style={styles.bestItem}>
                      <Text style={styles.bestLabel}>Heaviest</Text>
                      <Text style={styles.bestValue}>{formatHeaviest(item)}</Text>
                    </View>
                    <View style={styles.bestItem}>
                      <Text style={styles.bestLabel}>Est. 1RM</Text>
                      <Text style={[styles.bestValue, styles.bestValueAccent]}>
                        {formatEstimatedOneRepMax(item)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.exerciseFooter}>
                    Last performed {formatDate(item.lastPerformedDate ?? new Date().toISOString())}
                  </Text>
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
  if (item.recentTrend === 'insufficient_data') return 'Baseline';
  if (item.recentTrend === 'up') return 'Trending ↑';
  if (item.recentTrend === 'down') return 'Trending ↓';
  return 'Stable';
}

function getTrendTone(item: PersonalBestSummary) {
  if (item.recentTrend === 'up') return 'success' as const;
  if (item.recentTrend === 'down') return 'warning' as const;
  return 'default' as const;
}

function formatHeaviest(item: PersonalBestSummary) {
  if (!item.heaviestWeight.weight) return 'No load yet';
  return `${item.heaviestWeight.weight} lb${item.heaviestWeight.reps ? ` × ${item.heaviestWeight.reps}` : ''}`;
}

function formatEstimatedOneRepMax(item: PersonalBestSummary) {
  if (!item.bestEstimatedOneRepMax.value) return 'N/A';
  return `${Math.round(item.bestEstimatedOneRepMax.value)} lb`;
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: 110,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statFlex: {
    flex: 1,
  },

  // Trend
  trendNumber: {
    color: colors.text,
    fontSize: 38,
    fontWeight: fontWeights.heavy,
    letterSpacing: -0.8,
    marginTop: spacing.xs,
  },
  trendDate: {
    color: colors.accent,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    marginTop: 4,
  },
  trendDeltaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  trendDelta: {
    color: colors.textMuted,
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.heavy,
  },
  trendUp: {
    color: colors.success,
  },
  trendDown: {
    color: colors.warning,
  },
  trendDeltaLabel: {
    color: colors.textSoft,
    fontSize: fontSizes.md,
  },
  trendDetail: {
    color: colors.textMuted,
    fontSize: fontSizes.md,
    lineHeight: 22,
    marginTop: spacing.sm,
  },

  // Consistency
  consistencyList: {
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  consistencyRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  consistencyLabel: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.heavy,
    textTransform: 'uppercase',
    width: 60,
  },
  consistencyBarWrap: {
    flex: 1,
  },
  consistencyValue: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.heavy,
    textAlign: 'right',
    width: 20,
  },

  // Exercise cards
  exerciseCard: {
    backgroundColor: colors.surfaceCard,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.lg,
  },
  rowPressed: {
    opacity: 0.78,
  },
  exerciseHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  exerciseMeta: {
    flex: 1,
    gap: 3,
  },
  exerciseName: {
    color: colors.text,
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.heavy,
  },
  exerciseSubtext: {
    color: colors.textSoft,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  bestGrid: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  bestItem: {
    gap: 3,
  },
  bestLabel: {
    color: colors.textSoft,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.heavy,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  bestValue: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.heavy,
  },
  bestValueAccent: {
    color: colors.accent,
  },
  exerciseFooter: {
    color: colors.textSoft,
    fontSize: fontSizes.sm,
    marginTop: 2,
  },
});
