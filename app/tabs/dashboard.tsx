import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../components/AuthProvider';
import { AppScreen } from '../../components/AppScreen';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { GlassCard } from '../../components/ui/GlassCard';
import { Input } from '../../components/ui/Input';
import { LoadingState } from '../../components/ui/LoadingState';
import { Pill } from '../../components/ui/Pill';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { addBodyMetric, deleteBodyMetric, getAllExerciseLogs, getBodyMetrics, getLatestBodyMetric, getRecentWorkoutSessions } from '../../lib/supabase';
import { colors, fontSizes, fontWeights, radius, spacing } from '../../lib/theme';
import { getAllPersonalBests, getExerciseSessionVolume, getProgressionRecommendation, groupExerciseLogsByExercise } from '../../lib/progression';
import { getLatestWorkout, getWorkoutsThisWeekCount } from '../../lib/workouts';
import type { BodyMetric, ExerciseLog, PersonalBestSummary, ProgressionRecommendation, WorkoutSession } from '../../types/supabase';

export default function DashboardScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');
  const [notes, setNotes] = useState('');
  const [latestMetric, setLatestMetric] = useState<BodyMetric | null>(null);
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [recentSessions, setRecentSessions] = useState<WorkoutSession[]>([]);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weightModalVisible, setWeightModalVisible] = useState(false);

  const loadMetrics = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    const [latestResult, metricsResult, sessionsResult, logsResult] = await Promise.all([
      getLatestBodyMetric(),
      getBodyMetrics(),
      getRecentWorkoutSessions(6),
      getAllExerciseLogs(),
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

    if (sessionsResult.error) {
      setError(sessionsResult.error.message);
      setRecentSessions([]);
    } else {
      setRecentSessions(sessionsResult.data ?? []);
    }

    if (logsResult.error) {
      setError(logsResult.error.message);
      setExerciseLogs([]);
    } else {
      setExerciseLogs(logsResult.data ?? []);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  const latestWorkout = useMemo(() => getLatestWorkout(recentSessions), [recentSessions]);
  const workoutsThisWeek = useMemo(() => getWorkoutsThisWeekCount(recentSessions), [recentSessions]);
  const currentPrs = useMemo(
    () =>
      getAllPersonalBests(exerciseLogs)
        .sort((left, right) => {
          const rightDate = right.lastPerformedDate ? new Date(right.lastPerformedDate).getTime() : 0;
          const leftDate = left.lastPerformedDate ? new Date(left.lastPerformedDate).getTime() : 0;
          if (rightDate !== leftDate) return rightDate - leftDate;
          return (right.bestEstimatedOneRepMax.value ?? 0) - (left.bestEstimatedOneRepMax.value ?? 0);
        })
        .slice(0, 3),
    [exerciseLogs],
  );
  const nextTarget = useMemo(() => getDashboardRecommendation(exerciseLogs), [exerciseLogs]);
  const recentWorkoutSummary = useMemo(
    () => getRecentWorkoutSummary(latestWorkout, exerciseLogs),
    [latestWorkout, exerciseLogs],
  );
  const weightDelta = metrics.length >= 2 ? (latestMetric && metrics[1] ? latestMetric.weight - metrics[1].weight : null) : null;

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
    setWeightModalVisible(false);
    await loadMetrics(true);
  }

  async function handleDelete(id: string) {
    setError(null);
    const result = await deleteBodyMetric(id);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    await loadMetrics(true);
  }

  return (
    <>
      <AppScreen
        title={getGreeting()}
        description={`${profile?.name ?? 'Athlete'} · ${workoutsThisWeek} session${workoutsThisWeek !== 1 ? 's' : ''} this week`}
        refreshing={refreshing}
        onRefresh={() => void loadMetrics(true)}
      >
        {loading ? (
          <LoadingState message="Loading your dashboard..." />
        ) : (
          <View style={styles.content}>
            {/* Hero: primary Start Workout CTA */}
            <Card accent style={styles.heroCard}>
              <View style={styles.heroStats}>
                <View style={styles.heroStat}>
                  <Text style={styles.heroNumber}>
                    {latestMetric ? `${latestMetric.weight}` : '--'}
                  </Text>
                  <Text style={styles.heroLabel}>lb bodyweight</Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStat}>
                  <Text style={styles.heroNumber}>{workoutsThisWeek}</Text>
                  <Text style={styles.heroLabel}>this week</Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStat}>
                  <Text style={[
                    styles.heroNumber,
                    weightDelta !== null && weightDelta > 0 && styles.heroNumberUp,
                    weightDelta !== null && weightDelta < 0 && styles.heroNumberDown,
                  ]}>
                    {weightDelta === null
                      ? '--'
                      : weightDelta > 0
                      ? `+${weightDelta.toFixed(1)}`
                      : weightDelta.toFixed(1)}
                  </Text>
                  <Text style={styles.heroLabel}>lb delta</Text>
                </View>
              </View>

              <View style={styles.heroActions}>
                <Button
                  label="Start Workout"
                  onPress={() => router.push('/workout/new')}
                  size="sm"
                  style={styles.heroActionButton}
                />
                <Button
                  label="Log Weight"
                  leftIcon={<Ionicons name="scale-outline" size={18} color={colors.accent} />}
                  onPress={() => setWeightModalVisible(true)}
                  size="sm"
                  variant="glass"
                  style={styles.heroActionButton}
                />
              </View>
            </Card>

            {error ? <ErrorState message={error} /> : null}

            {/* Next Target */}
            <GlassCard style={styles.nextTargetCard}>
              <SectionHeader title="Next Target" subtitle="Your most relevant lift recommendation." />
              {nextTarget ? (
                <>
                  <Text style={styles.nextExercise}>{nextTarget.exerciseName}</Text>
                  <Text style={styles.nextValue}>{formatRecommendationTarget(nextTarget)}</Text>
                  <Text style={styles.nextReason}>{nextTarget.reason}</Text>
                  <View style={styles.nextPillRow}>
                    <Pill label={formatRecommendationType(nextTarget.recommendationType)} tone="accent" />
                    <Pill label={`${nextTarget.confidence} confidence`} />
                  </View>
                </>
              ) : (
                <EmptyState
                  title="No recommendation yet"
                  description="Finish a workout with logged sets to unlock your next deterministic target."
                  action="Start Workout"
                  onPressAction={() => router.push('/workout/new')}
                />
              )}
            </GlassCard>

            {/* Personal Bests */}
            <Card>
              <SectionHeader
                title="Top PRs"
                subtitle="Your strongest recent lifts."
                actionLabel="View all"
                onPressAction={() => router.push('/tabs/progress')}
              />
              {currentPrs.length === 0 ? (
                <EmptyState
                  title="No PRs yet"
                  description="Finish a few workouts and your best lifts will appear here."
                  icon="🏆"
                />
              ) : (
                currentPrs.map((item) => (
                  <Pressable
                    key={item.exerciseName}
                    onPress={() =>
                      router.push({
                        pathname: '/progress/[exerciseName]',
                        params: { exerciseName: item.exerciseName },
                      })
                    }
                    style={({ pressed }) => [styles.prRow, pressed && styles.rowPressed]}
                  >
                    <View style={styles.prMeta}>
                      <Text style={styles.prExercise}>{item.exerciseName}</Text>
                      <Text style={styles.prDetail}>
                        {formatHeaviest(item)} · Est. 1RM {formatEstimatedOneRepMax(item)}
                      </Text>
                    </View>
                    <Pill label="PR" tone="pr" />
                  </Pressable>
                ))
              )}
            </Card>

            {/* Recent Workout */}
            <Card>
              <SectionHeader title="Last Session" subtitle="Your most recent completed workout." />
              {recentWorkoutSummary ? (
                <>
                  <Text style={styles.recentWorkoutTitle}>{recentWorkoutSummary.title}</Text>
                  <Text style={styles.recentWorkoutMeta}>
                    {formatDate(recentWorkoutSummary.startedAt)} · {recentWorkoutSummary.duration}
                  </Text>
                  <Text style={styles.recentWorkoutMeta}>
                    Top: {recentWorkoutSummary.topExercise} · Vol: {recentWorkoutSummary.volume}
                  </Text>
                  <Button
                    label="View Summary"
                    onPress={() => router.push(`/workout/${recentWorkoutSummary.id}`)}
                    variant="secondary"
                    size="sm"
                    style={styles.summaryButton}
                  />
                </>
              ) : (
                <EmptyState
                  title="No workouts yet"
                  description="Start your first session to unlock summaries, PRs, and progression."
                  action="Start Workout"
                  onPressAction={() => router.push('/workout/new')}
                  icon="🏋️"
                />
              )}
            </Card>

            {/* AI Coach entry */}
            <GlassCard style={styles.coachCard}>
              <View style={styles.coachCardHeader}>
                <View style={styles.coachAvatar}>
                  <Ionicons name="chatbubble-ellipses" size={18} color={colors.accent} />
                </View>
                <View style={styles.coachMeta}>
                  <Text style={styles.coachTitle}>AI Coach</Text>
                  <Text style={styles.coachSubtitle}>
                    Uses your logs, PRs, and progression targets
                  </Text>
                </View>
              </View>
              <Button
                label="Ask Coach"
                onPress={() => router.push('/tabs/coach')}
                variant="glass"
                size="sm"
              />
            </GlassCard>

            {/* Weight History */}
            <Card>
              <SectionHeader title="Weight History" subtitle="Your last five check-ins." />
              {metrics.length === 0 ? (
                <EmptyState
                  title="No weight entries yet"
                  description="Tap Log Weight in the hero card to start tracking."
                  icon="⚖️"
                />
              ) : (
                metrics.slice(0, 5).map((item) => (
                  <View key={item.id} style={styles.metricRow}>
                    <View style={styles.metricMeta}>
                      <Text style={styles.metricWeight}>{item.weight} lb</Text>
                      <Text style={styles.metricDetail}>
                        {item.waist ? `Waist ${item.waist} · ` : ''}{formatDate(item.logged_at)}
                      </Text>
                      {item.notes ? <Text style={styles.metricNotes}>{item.notes}</Text> : null}
                    </View>
                    <Pressable
                      onPress={() => void handleDelete(item.id)}
                      style={({ pressed }) => [styles.deleteButton, pressed && styles.deletePressed]}
                    >
                      <Ionicons name="trash-outline" size={15} color={colors.textSoft} />
                    </Pressable>
                  </View>
                ))
              )}
            </Card>
          </View>
        )}
      </AppScreen>

      {/* Log Weight Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={weightModalVisible}
        onRequestClose={() => setWeightModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setWeightModalVisible(false)} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboard}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Log Weight</Text>
                <Pressable
                  onPress={() => setWeightModalVisible(false)}
                  style={({ pressed }) => [styles.modalCancelButton, pressed && styles.modalCancelPressed]}
                >
                  <Text style={styles.modalCancel}>Cancel</Text>
                </Pressable>
              </View>
              <Input
                keyboardType="decimal-pad"
                label="Weight (lb)"
                onChangeText={setWeight}
                placeholder="185"
                value={weight}
              />
              <Input
                keyboardType="decimal-pad"
                label="Waist circumference (optional)"
                onChangeText={setWaist}
                placeholder="34"
                value={waist}
              />
              <Input
                label="Notes (optional)"
                multiline
                onChangeText={setNotes}
                placeholder="Morning weigh-in, after travel, etc."
                value={notes}
              />
              {error ? <ErrorState message={error} /> : null}
              <Button label="Save Weight" loading={saving} onPress={() => void handleSave()} />
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 5) return 'Night owl';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function getDashboardRecommendation(logs: ExerciseLog[]) {
  const candidates = groupExerciseLogsByExercise(logs)
    .map((group) => ({
      lastPerformed: group.logs[0]?.logged_at ?? '',
      recommendation: getProgressionRecommendation(group.exerciseName, group.logs),
    }))
    .filter((item) => item.recommendation.recommendationType !== 'not_enough_data');

  candidates.sort((left, right) => {
    const priority = getRecommendationPriority(right.recommendation) - getRecommendationPriority(left.recommendation);
    if (priority !== 0) return priority;
    return new Date(right.lastPerformed).getTime() - new Date(left.lastPerformed).getTime();
  });

  return candidates[0]?.recommendation ?? null;
}

function getRecommendationPriority(recommendation: ProgressionRecommendation) {
  if (recommendation.recommendationType === 'increase_weight' && recommendation.confidence === 'high') return 5;
  if (recommendation.recommendationType === 'repeat_weight') return 4;
  if (recommendation.recommendationType === 'increase_reps') return 3;
  if (recommendation.recommendationType === 'reduce_weight') return 2;
  if (recommendation.recommendationType === 'deload_or_caution') return 1;
  return 0;
}

function getRecentWorkoutSummary(latestWorkout: WorkoutSession | null, logs: ExerciseLog[]) {
  if (!latestWorkout) return null;

  const sessionLogs = logs.filter((log) => log.workout_session_id === latestWorkout.id);
  const grouped = groupExerciseLogsByExercise(sessionLogs);
  const topExercise = grouped
    .map((group) => ({
      exerciseName: group.exerciseName,
      volume: getExerciseSessionVolume(group.logs),
    }))
    .sort((left, right) => right.volume - left.volume)[0];

  return {
    id: latestWorkout.id,
    title: latestWorkout.title,
    startedAt: latestWorkout.started_at,
    duration: latestWorkout.duration_minutes ? `${latestWorkout.duration_minutes} min` : 'Duration N/A',
    topExercise: topExercise?.exerciseName ?? 'No exercise data',
    volume: sessionLogs.length > 0 ? `${Math.round(getExerciseSessionVolume(sessionLogs))} lb` : 'N/A',
  };
}

function formatRecommendationTarget(recommendation: ProgressionRecommendation) {
  if (recommendation.recommendedNextWeight === null) {
    return `Aim for ${recommendation.recommendedRepTarget}`;
  }
  return `${recommendation.recommendedNextWeight} lb × ${recommendation.recommendedRepTarget}`;
}

function formatRecommendationType(type: ProgressionRecommendation['recommendationType']) {
  switch (type) {
    case 'increase_weight': return 'Increase weight';
    case 'repeat_weight': return 'Repeat weight';
    case 'reduce_weight': return 'Reduce weight';
    case 'increase_reps': return 'Add reps';
    case 'deload_or_caution': return 'Caution';
    default: return 'Baseline';
  }
}

function formatHeaviest(item: PersonalBestSummary) {
  if (!item.heaviestWeight.weight) return 'No load yet';
  if (item.heaviestWeight.reps) return `${item.heaviestWeight.weight} lb × ${item.heaviestWeight.reps}`;
  return `${item.heaviestWeight.weight} lb`;
}

function formatEstimatedOneRepMax(item: PersonalBestSummary) {
  if (!item.bestEstimatedOneRepMax.value) return 'N/A';
  return `${Math.round(item.bestEstimatedOneRepMax.value)} lb`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: 110,
  },

  // Hero
  heroCard: {
    gap: spacing.xl,
  },
  heroStats: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  heroStat: {
    flex: 1,
    gap: 4,
  },
  heroStatDivider: {
    backgroundColor: colors.border,
    height: 36,
    marginHorizontal: spacing.sm,
    width: 1,
  },
  heroNumber: {
    color: colors.text,
    fontSize: 28,
    fontWeight: fontWeights.heavy,
    letterSpacing: -0.5,
  },
  heroNumberUp: {
    color: colors.success,
  },
  heroNumberDown: {
    color: colors.warning,
  },
  heroLabel: {
    color: colors.textSoft,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.heavy,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  heroActions: {
    alignItems: 'stretch',
    flexDirection: 'row',
    gap: spacing.md,
  },
  heroActionButton: {
    flex: 1,
  },

  // Next Target
  nextTargetCard: {
    gap: spacing.md,
  },
  nextPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  nextExercise: {
    color: colors.accent,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.heavy,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  nextValue: {
    color: colors.text,
    fontSize: 34,
    fontWeight: fontWeights.heavy,
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  nextReason: {
    color: colors.textMuted,
    fontSize: fontSizes.md,
    lineHeight: 22,
  },

  // PRs
  prRow: {
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
  prMeta: {
    flex: 1,
    gap: 4,
  },
  prExercise: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.heavy,
  },
  prDetail: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    lineHeight: 18,
  },

  // Recent workout
  recentWorkoutTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: fontWeights.heavy,
    letterSpacing: -0.3,
  },
  recentWorkoutMeta: {
    color: colors.textMuted,
    fontSize: fontSizes.md,
    lineHeight: 22,
  },
  summaryButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },

  // AI Coach entry
  coachCard: {
    gap: spacing.md,
  },
  coachCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  coachAvatar: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAccent,
    borderColor: colors.accentBorder,
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  coachMeta: {
    flex: 1,
    gap: 3,
  },
  coachTitle: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.heavy,
  },
  coachSubtitle: {
    color: colors.textSoft,
    fontSize: fontSizes.sm,
    lineHeight: 18,
  },

  // Weight history
  metricRow: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    paddingTop: spacing.md,
  },
  metricMeta: {
    flex: 1,
    gap: 3,
  },
  metricWeight: {
    color: colors.text,
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.heavy,
  },
  metricDetail: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    lineHeight: 18,
  },
  metricNotes: {
    color: colors.textSoft,
    fontSize: fontSizes.sm,
    lineHeight: 18,
  },
  deleteButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.xs,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  deletePressed: {
    opacity: 0.6,
  },

  // Log Weight Modal
  modalOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.70)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  modalKeyboard: {
    width: '100%',
  },
  modalContent: {
    backgroundColor: colors.backgroundElevated,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    gap: spacing.md,
    padding: spacing.xl,
    paddingBottom: 40,
  },
  modalHandle: {
    alignSelf: 'center',
    backgroundColor: colors.borderStrong,
    borderRadius: 3,
    height: 4,
    marginBottom: spacing.sm,
    width: 40,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  modalTitle: {
    color: colors.text,
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.heavy,
  },
  modalCancelButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  modalCancelPressed: {
    opacity: 0.7,
  },
  modalCancel: {
    color: colors.accent,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.heavy,
  },
});
