import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { ProgressBar } from '../../components/ui/ProgressBar';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { StatCard } from '../../components/ui/StatCard';
import { getWorkoutInsight } from '../../lib/coachApi';
import { buildSelectedExerciseContext } from '../../lib/coachContext';
import { normalizeWorkoutInsightResponse } from '../../lib/aiValidation';
import {
  getBestSetForExercise,
  getExercisePersonalBest,
  getGroupedExerciseSessions,
  getProgressionRecommendation,
} from '../../lib/progression';
import { getExerciseHistory, getProfile } from '../../lib/supabase';
import { colors, fontSizes, fontWeights, radius, spacing } from '../../lib/theme';
import type { WorkoutInsightResponse } from '../../types/ai';
import type { ExerciseLog } from '../../types/supabase';

export default function ExerciseDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ exerciseName: string }>();
  const exerciseName = decodeURIComponent(params.exerciseName ?? '');
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Insight state
  const [insightModalVisible, setInsightModalVisible] = useState(false);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightResult, setInsightResult] = useState<WorkoutInsightResponse | null>(null);
  const [insightError, setInsightError] = useState<string | null>(null);

  useEffect(() => {
    async function loadExerciseHistory() {
      if (!exerciseName) {
        setError('Exercise not found.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const result = await getExerciseHistory(exerciseName, 60);

      if (result.error) {
        setError(result.error.message);
        setLogs([]);
        setLoading(false);
        return;
      }

      setLogs(result.data ?? []);
      setLoading(false);
    }

    void loadExerciseHistory();
  }, [exerciseName]);

  const personalBest = useMemo(() => getExercisePersonalBest(logs), [logs]);
  const sessions = useMemo(() => getGroupedExerciseSessions(logs).slice(0, 5), [logs]);
  const bestSet = useMemo(() => getBestSetForExercise(logs), [logs]);
  const recommendation = useMemo(
    () => getProgressionRecommendation(exerciseName, logs),
    [exerciseName, logs],
  );
  const maxVolume = useMemo(
    () => sessions.reduce((best, session) => Math.max(best, session.totalVolume), 0),
    [sessions],
  );

  async function handleAskCoach() {
    setInsightLoading(true);
    setInsightError(null);

    try {
      // Build exercise-specific context from already-loaded logs + get profile
      const [profileResult] = await Promise.all([getProfile()]);
      const exerciseCtx = buildSelectedExerciseContext(exerciseName, logs);

      const result = await getWorkoutInsight({
        mode: 'exercise_detail',
        exerciseName,
        exerciseContext: exerciseCtx,
        profile: profileResult.data
          ? {
              name: profileResult.data.name,
              goal: profileResult.data.main_goal,
              experience: profileResult.data.experience_level,
              daysPerWeek: profileResult.data.days_per_week,
              preferredSplit: profileResult.data.preferred_split,
              equipment: profileResult.data.equipment,
              injuries: profileResult.data.injuries,
            }
          : null,
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

  return (
    <>
      <Stack.Screen options={{ title: exerciseName || 'Exercise Detail' }} />
      <AppScreen
        title={exerciseName || 'Exercise Detail'}
        description="Personal bests, recent sessions, and your next target."
      >
        {loading ? (
          <LoadingState message="Loading exercise history..." />
        ) : error ? (
          <ErrorState message={error} />
        ) : logs.length === 0 ? (
          <EmptyState
            title="No history found"
            description="Log this exercise in a workout first to see bests and recommendations."
          />
        ) : (
          <View style={styles.content}>
            {/* Next target hero */}
            <GlassCard style={styles.heroCard}>
              <SectionHeader
                title={exerciseName}
                subtitle={personalBest.muscleGroup ?? 'Muscle group not set'}
              />
              <Text style={styles.heroValue}>{formatRecommendationTarget(recommendation)}</Text>
              <Text style={styles.heroReason}>{recommendation.reason}</Text>
              <View style={styles.heroMetaRow}>
                <Pill
                  label={formatRecommendationType(recommendation.recommendationType)}
                  tone="accent"
                />
                <Pill label={`${recommendation.confidence} confidence`} />
              </View>
            </GlassCard>

            {/* PR stats grid */}
            <View style={styles.statGrid}>
              <StatCard label="Heaviest" value={formatHeaviest(personalBest)} />
              <StatCard
                label="Best est. 1RM"
                value={formatEstimatedOneRepMax(personalBest)}
                accent
              />
              <StatCard label="Best reps" value={formatRepAtWeight(personalBest)} />
              <StatCard
                label="Best volume"
                value={formatVolume(personalBest.highestSessionVolume.volume)}
              />
            </View>

            {/* Best set detail */}
            <Card>
              <SectionHeader
                title="Working data"
                subtitle="Your best set and most recent performance."
              />
              <Text style={styles.detailLine}>
                Best set: {bestSet ? `${bestSet.weight ?? 'BW'} lb × ${bestSet.reps ?? '-'}` : 'N/A'}
              </Text>
              <Text style={styles.detailLine}>
                Last performed: {formatDate(personalBest.lastPerformedDate)}
              </Text>
              <Text style={styles.detailLine}>
                Recent sets:{' '}
                {personalBest.mostRecentSets
                  .map((set) => `${set.weight ?? 'BW'} × ${set.reps ?? '-'}`)
                  .join(', ')}
              </Text>
            </Card>

            {/* Ask coach about this lift */}
            <Card style={styles.coachCard}>
              <SectionHeader
                title="Ask Coach"
                subtitle="AI analysis of this lift using your recent logs + PRs."
              />
              {insightError ? (
                <>
                  <Text style={styles.insightError}>{insightError}</Text>
                  <Button
                    label="Try Again"
                    onPress={() => void handleAskCoach()}
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
                    : 'Ask Coach About This Lift'
                }
                loading={insightLoading}
                onPress={
                  insightResult
                    ? () => setInsightModalVisible(true)
                    : () => void handleAskCoach()
                }
                variant="secondary"
              />
            </Card>

            {/* Recent sessions */}
            <Card>
              <SectionHeader
                title="Recent sessions"
                subtitle="Tap any session to open its full summary."
              />
              {sessions.map((session) => {
                const widthPercent =
                  maxVolume > 0
                    ? Math.max(10, Math.round((session.totalVolume / maxVolume) * 100))
                    : 10;

                return (
                  <Pressable
                    key={session.sessionId}
                    onPress={() => router.push(`/workout/${session.sessionId}`)}
                    style={({ pressed }) => [styles.sessionCard, pressed && styles.rowPressed]}
                  >
                    <View style={styles.sessionHeader}>
                      <Text style={styles.sessionDate}>{formatDate(session.loggedAt)}</Text>
                      <Text style={styles.sessionVolume}>
                        {Math.round(session.totalVolume)} lb vol
                      </Text>
                    </View>
                    <ProgressBar value={widthPercent} />
                    <Text style={styles.sessionSets}>
                      {session.sets
                        .map((set) => `${set.weight ?? 'BW'} × ${set.reps ?? '-'}`)
                        .join(', ')}
                    </Text>
                    <Text style={styles.sessionSubtext}>
                      Top {session.topWeight ?? 'N/A'} lb · Est. 1RM{' '}
                      {session.bestEstimatedOneRepMax
                        ? Math.round(session.bestEstimatedOneRepMax)
                        : 'N/A'}
                    </Text>
                  </Pressable>
                );
              })}
            </Card>
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
              <Text style={styles.modalTitle}>{exerciseName}</Text>
              <Text style={styles.modalSubtitle}>Coach Analysis</Text>
              <Text style={styles.modalContextNote}>Using your recent logs + PRs</Text>

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
                      <Text style={styles.insightSectionLabel}>HIGHLIGHTS</Text>
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
                      <Text style={styles.insightSectionLabel}>NEXT SESSION</Text>
                      <Text style={styles.nextFocusText}>{insightResult.nextFocus}</Text>
                    </View>
                  ) : null}

                  {insightResult.nextTargets.map((target) => (
                    <View key={target.exerciseName} style={styles.targetCard}>
                      <Text style={styles.targetLabel}>TARGET</Text>
                      <Text style={styles.targetValue}>{target.target}</Text>
                      <Text style={styles.targetReason}>{target.reason}</Text>
                    </View>
                  ))}
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

function formatRecommendationTarget(
  recommendation: ReturnType<typeof getProgressionRecommendation>,
) {
  if (recommendation.recommendedNextWeight === null) {
    return `Aim for ${recommendation.recommendedRepTarget}`;
  }
  return `Try ${recommendation.recommendedNextWeight} lb × ${recommendation.recommendedRepTarget}`;
}

function formatRecommendationType(
  type: ReturnType<typeof getProgressionRecommendation>['recommendationType'],
) {
  switch (type) {
    case 'increase_weight':
      return 'Increase weight';
    case 'repeat_weight':
      return 'Repeat weight';
    case 'reduce_weight':
      return 'Reduce weight';
    case 'increase_reps':
      return 'Add reps';
    case 'deload_or_caution':
      return 'Caution';
    default:
      return 'Baseline';
  }
}

function formatHeaviest(logs: ReturnType<typeof getExercisePersonalBest>) {
  if (!logs.heaviestWeight.weight) return 'N/A';
  return `${logs.heaviestWeight.weight} lb${logs.heaviestWeight.reps ? ` × ${logs.heaviestWeight.reps}` : ''}`;
}

function formatEstimatedOneRepMax(personalBest: ReturnType<typeof getExercisePersonalBest>) {
  return personalBest.bestEstimatedOneRepMax.value
    ? `${Math.round(personalBest.bestEstimatedOneRepMax.value)} lb`
    : 'N/A';
}

function formatRepAtWeight(personalBest: ReturnType<typeof getExercisePersonalBest>) {
  if (!personalBest.bestRepAtWeight.weight || !personalBest.bestRepAtWeight.reps) return 'N/A';
  return `${personalBest.bestRepAtWeight.weight} × ${personalBest.bestRepAtWeight.reps}`;
}

function formatVolume(volume: number | null) {
  return volume ? `${Math.round(volume)} lb` : 'N/A';
}

function formatDate(value: string | null) {
  if (!value) return 'Never';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  heroCard: {
    gap: spacing.md,
  },
  heroValue: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
  },
  heroReason: {
    color: colors.textMuted,
    fontSize: fontSizes.md,
    lineHeight: 22,
  },
  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  detailLine: {
    color: colors.textMuted,
    fontSize: fontSizes.md,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  coachCard: {
    gap: spacing.md,
  },
  insightError: {
    color: colors.danger,
    fontSize: fontSizes.sm,
    lineHeight: 18,
  },
  sessionCard: {
    backgroundColor: colors.surfaceCard,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.lg,
  },
  rowPressed: {
    opacity: 0.82,
  },
  sessionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sessionDate: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: '800',
  },
  sessionVolume: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    fontWeight: '700',
  },
  sessionSets: {
    color: colors.text,
    fontSize: fontSizes.md,
    lineHeight: 20,
  },
  sessionSubtext: {
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
  modalContextNote: {
    color: colors.textSoft,
    fontSize: fontSizes.sm,
    lineHeight: 18,
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
  targetLabel: {
    color: colors.accent,
    fontSize: fontSizes.xs,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  targetValue: {
    color: colors.text,
    fontSize: fontSizes.xl,
    fontWeight: '800',
  },
  targetReason: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    lineHeight: 18,
  },
});
