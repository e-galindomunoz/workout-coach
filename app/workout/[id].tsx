import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
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
import { colors, fontSizes, fontWeights, radius, spacing } from '../../lib/theme';
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
              (entry) => entry.exerciseName === highlight.exerciseName && entry.type === highlight.type,
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
      `Delete "${session.title}" and all its logged sets? This cannot be undone.`,
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
          title: 'Summary',
          headerRight: () =>
            session ? (
              <Pressable onPress={confirmDeleteWorkout}>
                <Text style={styles.headerDelete}>Delete</Text>
              </Pressable>
            ) : null,
        }}
      />
      <AppScreen
        title={session?.title ?? 'Workout'}
        description={
          session
            ? `${formatDate(session.started_at)}${session.duration_minutes ? ` · ${session.duration_minutes} min` : ''}`
            : 'Session summary'
        }
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
            {/* Stats grid */}
            <View style={styles.summaryGrid}>
              <StatCard
                label="Duration"
                value={`${session.duration_minutes ?? 0} min`}
                style={styles.statHalf}
              />
              <StatCard
                label="Exercises"
                value={`${groupedLogs.length}`}
                accent
                style={styles.statHalf}
              />
              <StatCard
                label="Total sets"
                value={`${countWorkoutSets(groupedLogs.map((group) => ({ sets: group.logs })))}`}
                style={styles.statHalf}
              />
              <StatCard
                label="Total volume"
                value={totalVolume > 0 ? `${Math.round(totalVolume)} lb` : 'N/A'}
                style={styles.statHalf}
              />
            </View>

            {/* PRs */}
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
                    <View style={styles.prValueRow}>
                      {highlight.previousValue ? (
                        <Text style={styles.prPrevious}>{highlight.previousValue}</Text>
                      ) : null}
                      {highlight.previousValue ? (
                        <Ionicons name="arrow-forward" size={14} color={colors.accentPR} />
                      ) : null}
                      <Text style={styles.prCurrent}>{highlight.currentValue}</Text>
                    </View>
                  </View>
                ))}
              </GlassCard>
            ) : (
              <Card>
                <SectionHeader title="Personal Records" subtitle="No new PRs this session." />
                <Text style={styles.noPrText}>
                  Keep stacking clean reps. Your next PR is coming.
                </Text>
              </Card>
            )}

            {/* AI Coach Insight */}
            <GlassCard style={styles.insightCard}>
              <View style={styles.insightCardHeader}>
                <View style={styles.insightAvatar}>
                  <Ionicons name="chatbubble-ellipses" size={16} color={colors.accent} />
                </View>
                <View style={styles.insightMeta}>
                  <Text style={styles.insightTitle}>Coach Insight</Text>
                  <Text style={styles.insightSubtitle}>
                    AI analysis using your logs + PRs
                  </Text>
                </View>
              </View>
              {insightError ? (
                <ErrorState message={insightError} onRetry={() => void handleGetInsight()} />
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
                onPress={insightResult ? () => setInsightModalVisible(true) : () => void handleGetInsight()}
                variant="glass"
              />
            </GlassCard>

            {/* Session notes */}
            {session.notes ? (
              <Card>
                <SectionHeader title="Session Notes" />
                <Text style={styles.notesText}>{session.notes}</Text>
              </Card>
            ) : null}

            {/* Exercises logged */}
            <Card>
              <SectionHeader
                title="Exercises Logged"
                subtitle={`${groupedLogs.length} exercise${groupedLogs.length !== 1 ? 's' : ''}`}
              />
              {groupedLogs.map((group) => (
                <View key={group.exerciseName} style={styles.exerciseCard}>
                  <Text style={styles.exerciseTitle}>{group.exerciseName}</Text>
                  {group.logs.map((log) => (
                    <View key={log.id} style={styles.setRow}>
                      <Text style={styles.setText}>
                        Set {log.set_number}
                        {'  '}
                        <Text style={styles.setValueText}>
                          {log.weight ?? 'BW'} lb × {log.reps ?? '-'} reps
                        </Text>
                        {typeof log.rpe === 'number' ? (
                          <Text style={styles.setMetaText}> · RPE {log.rpe}</Text>
                        ) : null}
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
              <Text style={styles.modalSubtitle}>USING YOUR LOGS + PRs</Text>

              {insightResult?.safetyNote ? (
                <View style={styles.safetyBanner}>
                  <Ionicons name="warning-outline" size={16} color={colors.danger} />
                  <Text style={styles.safetyBannerText}>{insightResult.safetyNote}</Text>
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
                          <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
                          <Text style={styles.winText}>{win}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {insightResult.nextFocus ? (
                    <View style={styles.insightSection}>
                      <Text style={styles.insightSectionLabel}>NEXT SESSION FOCUS</Text>
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

              <Button label="Close" onPress={() => setInsightModalVisible(false)} variant="secondary" />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

const styles = StyleSheet.create({
  headerDelete: {
    color: colors.danger,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.heavy,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  // Stats grid
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statHalf: {
    flexBasis: '47%',
    flexGrow: 1,
  },

  // PRs
  prSection: {
    gap: spacing.md,
  },
  prCard: {
    backgroundColor: 'rgba(199, 232, 107, 0.06)',
    borderColor: 'rgba(199, 232, 107, 0.22)',
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  prCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  prExercise: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.heavy,
  },
  prLabel: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
  },
  prValueRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  prPrevious: {
    color: colors.textSoft,
    fontSize: fontSizes.md,
    textDecorationLine: 'line-through',
  },
  prCurrent: {
    color: colors.accentPR,
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.heavy,
    letterSpacing: -0.2,
  },
  noPrText: {
    color: colors.textMuted,
    fontSize: fontSizes.md,
    lineHeight: 22,
  },

  // Insight card
  insightCard: {
    gap: spacing.md,
  },
  insightCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  insightAvatar: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAccent,
    borderColor: colors.accentBorder,
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  insightMeta: {
    flex: 1,
    gap: 3,
  },
  insightTitle: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.heavy,
  },
  insightSubtitle: {
    color: colors.textSoft,
    fontSize: fontSizes.sm,
  },

  // Notes
  notesText: {
    color: colors.textMuted,
    fontSize: fontSizes.md,
    lineHeight: 22,
  },

  // Exercises logged
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
    fontWeight: fontWeights.heavy,
    letterSpacing: -0.2,
  },
  setRow: {
    gap: 4,
  },
  setText: {
    color: colors.textSoft,
    fontSize: fontSizes.md,
    lineHeight: 20,
  },
  setValueText: {
    color: colors.text,
    fontWeight: fontWeights.bold,
  },
  setMetaText: {
    color: colors.textSoft,
  },
  setNote: {
    color: colors.textSoft,
    fontSize: fontSizes.sm,
    lineHeight: 18,
  },

  // Modal
  modalOverlay: {
    backgroundColor: 'rgba(0,0,0,0.75)',
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
    maxHeight: '88%',
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
    fontWeight: fontWeights.heavy,
    letterSpacing: -0.4,
  },
  modalSubtitle: {
    color: colors.accent,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.heavy,
    letterSpacing: 1.8,
    marginTop: -spacing.sm,
    textTransform: 'uppercase',
  },
  safetyBanner: {
    alignItems: 'flex-start',
    backgroundColor: colors.dangerSurface,
    borderColor: 'rgba(224, 108, 117, 0.35)',
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  safetyBannerText: {
    color: colors.danger,
    flex: 1,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.heavy,
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
    fontWeight: fontWeights.heavy,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  winRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
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
    fontWeight: fontWeights.bold,
    lineHeight: 24,
  },
  targetCard: {
    backgroundColor: colors.surfaceAccent,
    borderColor: colors.accentBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  targetExercise: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.heavy,
  },
  targetValue: {
    color: colors.accent,
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.heavy,
    letterSpacing: -0.2,
  },
  targetReason: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    lineHeight: 18,
  },
});
