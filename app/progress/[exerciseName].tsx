import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { GlassCard } from '../../components/ui/GlassCard';
import { LoadingState } from '../../components/ui/LoadingState';
import { Pill } from '../../components/ui/Pill';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { StatCard } from '../../components/ui/StatCard';
import { getBestSetForExercise, getExercisePersonalBest, getGroupedExerciseSessions, getProgressionRecommendation } from '../../lib/progression';
import { getExerciseHistory } from '../../lib/supabase';
import { colors, fontSizes, radius, spacing } from '../../lib/theme';
import type { ExerciseLog } from '../../types/supabase';

export default function ExerciseDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ exerciseName: string }>();
  const exerciseName = decodeURIComponent(params.exerciseName ?? '');
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
                <Pill label={formatRecommendationType(recommendation.recommendationType)} tone="accent" />
                <Pill label={`${recommendation.confidence} confidence`} />
              </View>
            </GlassCard>

            {/* PR stats grid */}
            <View style={styles.statGrid}>
              <StatCard label="Heaviest" value={formatHeaviest(personalBest)} />
              <StatCard label="Best est. 1RM" value={formatEstimatedOneRepMax(personalBest)} accent />
              <StatCard label="Best reps" value={formatRepAtWeight(personalBest)} />
              <StatCard label="Best volume" value={formatVolume(personalBest.highestSessionVolume.volume)} />
            </View>

            {/* Best set detail */}
            <Card>
              <SectionHeader title="Working data" subtitle="Your best set and most recent performance." />
              <Text style={styles.detailLine}>
                Best set: {bestSet ? `${bestSet.weight ?? 'BW'} lb × ${bestSet.reps ?? '-'}` : 'N/A'}
              </Text>
              <Text style={styles.detailLine}>
                Last performed: {formatDate(personalBest.lastPerformedDate)}
              </Text>
              <Text style={styles.detailLine}>
                Recent sets: {personalBest.mostRecentSets.map((set) => `${set.weight ?? 'BW'} × ${set.reps ?? '-'}`).join(', ')}
              </Text>
            </Card>

            {/* Recent sessions */}
            <Card>
              <SectionHeader title="Recent sessions" subtitle="Tap any session to open its full summary." />
              {sessions.map((session) => {
                const widthPercent =
                  maxVolume > 0 ? Math.max(10, Math.round((session.totalVolume / maxVolume) * 100)) : 10;

                return (
                  <Pressable
                    key={session.sessionId}
                    onPress={() => router.push(`/workout/${session.sessionId}`)}
                    style={({ pressed }) => [styles.sessionCard, pressed && styles.rowPressed]}
                  >
                    <View style={styles.sessionHeader}>
                      <Text style={styles.sessionDate}>{formatDate(session.loggedAt)}</Text>
                      <Text style={styles.sessionVolume}>{Math.round(session.totalVolume)} lb vol</Text>
                    </View>
                    <ProgressBar value={widthPercent} />
                    <Text style={styles.sessionSets}>
                      {session.sets
                        .map((set) => `${set.weight ?? 'BW'} × ${set.reps ?? '-'}`)
                        .join(', ')}
                    </Text>
                    <Text style={styles.sessionSubtext}>
                      Top {session.topWeight ?? 'N/A'} lb · Est. 1RM {session.bestEstimatedOneRepMax ? Math.round(session.bestEstimatedOneRepMax) : 'N/A'}
                    </Text>
                  </Pressable>
                );
              })}
            </Card>
          </View>
        )}
      </AppScreen>
    </>
  );
}

function formatRecommendationTarget(recommendation: ReturnType<typeof getProgressionRecommendation>) {
  if (recommendation.recommendedNextWeight === null) {
    return `Aim for ${recommendation.recommendedRepTarget}`;
  }

  return `Try ${recommendation.recommendedNextWeight} lb × ${recommendation.recommendedRepTarget}`;
}

function formatRecommendationType(type: ReturnType<typeof getProgressionRecommendation>['recommendationType']) {
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
  if (!logs.heaviestWeight.weight) {
    return 'N/A';
  }

  return `${logs.heaviestWeight.weight} lb${logs.heaviestWeight.reps ? ` × ${logs.heaviestWeight.reps}` : ''}`;
}

function formatEstimatedOneRepMax(personalBest: ReturnType<typeof getExercisePersonalBest>) {
  return personalBest.bestEstimatedOneRepMax.value ? `${Math.round(personalBest.bestEstimatedOneRepMax.value)} lb` : 'N/A';
}

function formatRepAtWeight(personalBest: ReturnType<typeof getExercisePersonalBest>) {
  if (!personalBest.bestRepAtWeight.weight || !personalBest.bestRepAtWeight.reps) {
    return 'N/A';
  }

  return `${personalBest.bestRepAtWeight.weight} × ${personalBest.bestRepAtWeight.reps}`;
}

function formatVolume(volume: number | null) {
  return volume ? `${Math.round(volume)} lb` : 'N/A';
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
});
