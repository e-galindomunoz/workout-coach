import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { GlassCard } from '../../components/ui/GlassCard';
import { LoadingState } from '../../components/ui/LoadingState';
import { Pill } from '../../components/ui/Pill';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { StatCard } from '../../components/ui/StatCard';
import { getWorkoutInsight } from '../../lib/coachApi';
import { getCoachContext } from '../../lib/coachContext';
import { normalizeWorkoutInsightResponse } from '../../lib/aiValidation';
import { getExercisePrHighlights } from '../../lib/progression';
import {
  deleteWorkoutSession,
  getExerciseHistory,
  getExerciseLogsBySession,
  getWorkoutSessionById,
} from '../../lib/supabase';
import { colors, fontSizes, radius, spacing } from '../../lib/theme';
import { calculateTotalVolume, countWorkoutSets, groupExerciseLogs } from '../../lib/workouts';
import type { WorkoutInsightResponse } from '../../types/ai';
import type { ExerciseLog, PrHighlight, WorkoutSession } from '../../types/supabase';

export default function WorkoutSummaryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [prHighlights, setPrHighlights] = useState<PrHighlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Insight state
  const [insightModalVisible, setInsightModalVisible] = useState(false);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightResult, setInsightResult] = useState<WorkoutInsightResponse | null>(null);
  const [insightError, setInsightError] = useState<string | null>(null);

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
        setPrHighlights([]);
      } else {
        const sessionLogs = logsResult.data ?? [];
        setLogs(sessionLogs);

        const grouped = groupExerciseLogs(sessionLogs);
        const highlightResults = await Promise.all(
          grouped.map(async (group) => {
            const historyResult = await getExerciseHistory(group.exerciseName, 60);
            if (historyResult.error) return [];
            const previousLogs = (historyResult.data ?? []).filter(
              (log) => log.workout_session_id !== id,
            );
            return getExercisePrHighlights(group.exerciseName, group.logs, previousLogs);
          }),
        );

        const flattened = highlightResults.flat();
        const unique = flattened.filter(
          (highlight, index) =>
            flattened.findIndex(
              (entry) =>
                entry.exerciseName === highlight.exerciseName && entry.type === highlight.type,
            ) === index,
        );
        setPrHighlights(unique);
      }

      setLoading(false);
    }

    void loadSummary();
  }, [id]);

  const groupedLogs = useMemo(() => groupExerciseLogs(logs), [logs]);
  const totalVolume = useMemo(() => calculateTotalVolume(logs), [logs]);

  async function handleGetInsight() {
    if (!session) return;
    setInsightLoading(true);
    setInsightError(null);

    try {
      // Get shared context (profile, recent training, progressions) in parallel
      const ctx = await getCoachContext();

      const result = await getWorkoutInsight({
        mode: 'post_workout',
        completedWorkout: {
          title: session.title,
          durationMinutes: session.duration_minutes,
          exercises: groupedLogs.map((g) => ({
            name: g.exerciseName,
            totalSets: g.logs.length,
            sets: g.logs.map((l) => `${l.weight ?? 'BW'} × ${l.reps ?? '-'}`),
          })),
          newPRs: prHighlights.map((pr) => ({
            exercise: pr.exerciseName,
            label: pr.label,
            previous: pr.previousValue,
            current: pr.currentValue,
          })),
          painFlagCount: logs.filter((log) => log.pain_flag).length,
        },
        profile: ctx.profile,
        recentTraining: ctx.recentTraining,
        progressionRecommendations: ctx.progressionRecommendations,
      });

      if (result.error || !result.data) {
        setInsightError(result.error?.message ?? 'Could not reach the coach. Check your connection.');
      } else {
        setInsightResult(
          normalizeWorkoutInsightResponse(
            result.data,
            logs.some((log) => log.pain_flag) ? 'Use caution and stop if symptoms worsen.' : null,
          ),
        );
        setInsightModalVisible(true);
      }
    } finally {
      setInsightLoading(false);
    }
  }

  function confirmDeleteWorkout() {
    if (!session) return;
    Alert.alert(
      'Delete workout?',
      `Delete "${session.title}" and all its logged sets?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void handleDeleteWorkout() },
      ],
    );
  }

  async function handleDeleteWorkout() {
    if (!session) return;
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
        description="A clean recap of this completed session."
      >
        {loading ? (
          <LoadingState message="Loading workout summary..." />
        ) : error ? (
          <ErrorState message={error} />
        ) : !session ? (
          <EmptyState
            title="Workout not found"
            description="This workout session could not be loaded."
          />
        ) : (
          <View style={styles.content}>
            <View style={styles.summaryGrid}>
              <StatCard label="Duration" value={`${session.duration_minutes ?? 0} min`} />
              <StatCard label="Exercises" value={`${groupedLogs.length}`} accent />
              <StatCard
                label="Total sets"
                value={`${countWorkoutSets(groupedLogs.map((group) => ({ sets: group.logs })))}`}
              />
              <StatCard
                label="Total volume"
                value={totalVolume > 0 ? `${Math.round(totalVolume)} lb` : 'N/A'}
              />
            </View>

            {prHighlights.length > 0 ? (
              <GlassCard style={styles.prSection}>
                <SectionHeader
                  title="New PRs"
                  subtitle={`${prHighlights.length} personal best${prHighlights.length !== 1 ? 's' : ''} this session`}
                />
                {prHighlights.map((highlight) => (
                  <View
                    key={`${highlight.exerciseName}-${highlight.type}`}
                    style={styles.prCard}
                  >
                    <View style={styles.prCardHeader}>
                      <Pill label="New PR" tone="pr" />
                      <Text style={styles.prExercise}>{highlight.exerciseName}</Text>
                    </View>
                    <Text style={styles.prLabel}>{highlight.label}</Text>
                    <Text style={styles.prValues}>
                      {highlight.previousValue} → {highlight.currentValue}
                    </Text>
                  </View>
                ))}
              </GlassCard>
            ) : (
              <Card accent>
                <SectionHeader title="PRs" subtitle="No new personal bests this session." />
                <EmptyState
                  title="No new PRs"
                  description="Keep stacking clean work. The next PR will show up here."
                />
              </Card>
            )}

            {/* AI Coach Insight */}
            <Card style={styles.insightCard}>
              <SectionHeader
                title="Coach Insight"
                subtitle="AI analysis of this session using your recent logs + PRs."
              />
              {insightError ? (
                <>
                  <Text style={styles.insightError}>{insightError}</Text>
                  <Button
                    label="Try Again"
                    onPress={() => void handleGetInsight()}
                    variant="secondary"
                  />
                </>
              ) : null}
              <Button
                label={
                  insightLoading
                    ? 'Analyzing...'
                    : insightResult
                      ? 'View Insight'
                      : 'Get Coach Insight'
                }
                loading={insightLoading}
                onPress={
                  insightResult ? () => setInsightModalVisible(true) : () => void handleGetInsight()
                }
                variant="secondary"
              />
            </Card>

            {session.notes ? (
              <Card>
                <SectionHeader title="Session notes" />
                <Text style={styles.notesText}>{session.notes}</Text>
              </Card>
            ) : null}

            <Card>
              <SectionHeader
                title="Exercises logged"
                subtitle="Every set from this workout."
              />
              {groupedLogs.map((group) => (
                <View key={group.exerciseName} style={styles.exerciseCard}>
                  <Text style={styles.exerciseTitle}>{group.exerciseName}</Text>
                  {group.logs.map((log) => (
                    <View key={log.id} style={styles.setRow}>
                      <Text style={styles.setText}>
                        Set {log.set_number}: {log.weight ?? 'BW'} lb × {log.reps ?? '-'} reps
                        {typeof log.rpe === 'number' ? ` · RPE ${log.rpe}` : ''}
                      </Text>
                      {log.pain_flag ? <Pill label="Pain flagged" tone="danger" /> : null}
                      {log.notes ? <Text style={styles.setNote}>{log.notes}</Text> : null}
                    </View>
                  ))}
                </View>
              ))}
            </Card>

            <Button
              label="Back to Workouts"
              onPress={() => router.replace('/tabs/workout')}
              variant="secondary"
            />
          </View>
        )}
      </AppScreen>

      {/* Insight modal */}
      <Modal
        animationType="slide"
        transparent
        visible={insightModalVisible}
        onRequestClose={() => setInsightModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setInsightModalVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <ScrollView
              contentContainerStyle={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalTitle}>Coach Insight</Text>
              <Text style={styles.modalSubtitle}>Using your recent logs + PRs</Text>

              {insightResult?.safetyNote ? (
                <View style={styles.safetyBanner}>
                  <Text style={styles.safetyBannerText}>⚠ {insightResult.safetyNote}</Text>
                </View>
              ) : null}

              {insightResult ? (
                <>
                  <Text style={styles.insightSummary}>{insightResult.summary}</Text>

                  {insightResult.wins.length > 0 ? (
                    <View style={styles.insightSection}>
                      <Text style={styles.insightSectionLabel}>KEY WINS</Text>
                      {insightResult.wins.map((win, i) => (
                        <View key={i} style={styles.winRow}>
                          <Text style={styles.winBullet}>✓</Text>
                          <Text style={styles.winText}>{win}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {insightResult.nextFocus ? (
                    <View style={styles.insightSection}>
                      <Text style={styles.insightSectionLabel}>NEXT FOCUS</Text>
                      <Text style={styles.nextFocusText}>{insightResult.nextFocus}</Text>
                    </View>
                  ) : null}

                  {insightResult.nextTargets.length > 0 ? (
                    <View style={styles.insightSection}>
                      <Text style={styles.insightSectionLabel}>NEXT TARGETS</Text>
                      {insightResult.nextTargets.map((target) => (
                        <View key={target.exerciseName} style={styles.targetCard}>
                          <Text style={styles.targetExercise}>{target.exerciseName}</Text>
                          <Text style={styles.targetValue}>{target.target}</Text>
                          <Text style={styles.targetReason}>{target.reason}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </>
              ) : null}

              <Button
                label="Close"
                onPress={() => setInsightModalVisible(false)}
                variant="secondary"
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  headerDelete: {
    color: colors.danger,
    fontSize: fontSizes.md,
    fontWeight: '800',
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  prSection: {
    gap: spacing.md,
  },
  prCard: {
    backgroundColor: 'rgba(199, 232, 107, 0.06)',
    borderColor: 'rgba(199, 232, 107, 0.20)',
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  prCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  prExercise: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: '800',
  },
  prLabel: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    fontWeight: '700',
  },
  prValues: {
    color: colors.accentPR,
    fontSize: fontSizes.xl,
    fontWeight: '800',
    lineHeight: 28,
  },
  insightCard: {
    gap: spacing.md,
  },
  insightError: {
    color: colors.danger,
    fontSize: fontSizes.sm,
    lineHeight: 18,
  },
  notesText: {
    color: colors.textMuted,
    fontSize: fontSizes.md,
    lineHeight: 22,
  },
  exerciseCard: {
    backgroundColor: colors.surfaceCard,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.lg,
  },
  exerciseTitle: {
    color: colors.text,
    fontSize: fontSizes.xl,
    fontWeight: '800',
  },
  setRow: {
    gap: 5,
  },
  setText: {
    color: colors.textMuted,
    fontSize: fontSizes.md,
    lineHeight: 20,
  },
  setNote: {
    color: colors.textSoft,
    fontSize: fontSizes.sm,
    lineHeight: 18,
  },

  // Modal
  modalOverlay: {
    backgroundColor: 'rgba(0,0,0,0.72)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: colors.backgroundElevated,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    paddingTop: spacing.md,
  },
  modalHandle: {
    alignSelf: 'center',
    backgroundColor: colors.borderStrong,
    borderRadius: 3,
    height: 4,
    marginBottom: spacing.md,
    width: 40,
  },
  modalContent: {
    gap: spacing.lg,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  modalTitle: {
    color: colors.text,
    fontSize: fontSizes.xxl,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  modalSubtitle: {
    color: colors.accent,
    fontSize: fontSizes.xs,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginTop: -spacing.sm,
    textTransform: 'uppercase',
  },
  safetyBanner: {
    backgroundColor: colors.dangerSurface,
    borderColor: colors.danger,
    borderRadius: radius.sm,
    borderWidth: 1,
    padding: spacing.md,
  },
  safetyBannerText: {
    color: colors.danger,
    fontSize: fontSizes.sm,
    fontWeight: '800',
    lineHeight: 20,
  },
  insightSummary: {
    color: colors.text,
    fontSize: fontSizes.md,
    lineHeight: 24,
  },
  insightSection: {
    gap: spacing.sm,
  },
  insightSectionLabel: {
    color: colors.accent,
    fontSize: fontSizes.xs,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  winRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  winBullet: {
    color: colors.accent,
    fontSize: fontSizes.md,
    fontWeight: '800',
    lineHeight: 22,
  },
  winText: {
    color: colors.textMuted,
    flex: 1,
    fontSize: fontSizes.md,
    lineHeight: 22,
  },
  nextFocusText: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: '700',
    lineHeight: 24,
  },
  targetCard: {
    backgroundColor: colors.surfaceAccent,
    borderColor: colors.borderAccent,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  targetExercise: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: '800',
  },
  targetValue: {
    color: colors.accent,
    fontSize: fontSizes.xl,
    fontWeight: '800',
  },
  targetReason: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    lineHeight: 18,
  },
});
