import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import {
  getBestSetForExercise,
  getExercisePersonalBest,
  getGroupedExerciseSessions,
  getProgressionRecommendation,
} from '../../lib/progression';
import { getExerciseHistory } from '../../lib/supabase';
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
        description="Review your personal bests, last five sessions, and the next deterministic training target."
      >
        {loading ? (
          <View style={styles.stateBlock}>
            <ActivityIndicator color="#38bdf8" />
            <Text style={styles.stateText}>Loading exercise history...</Text>
          </View>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : logs.length === 0 ? (
          <Text style={styles.emptyText}>No history found for this exercise yet.</Text>
        ) : (
          <View style={styles.content}>
            <View style={styles.heroCard}>
              <Text style={styles.cardLabel}>Next recommendation</Text>
              <Text style={styles.heroTitle}>
                {formatRecommendationTarget(recommendation)}
              </Text>
              <Text style={styles.heroReason}>{recommendation.reason}</Text>
              <Text style={styles.heroMeta}>
                Last time: {recommendation.lastPerformance}
              </Text>
              <Text style={styles.heroMeta}>
                Confidence: {recommendation.confidence}
              </Text>
            </View>

            <View style={styles.statGrid}>
              <StatCard
                label="Heaviest"
                value={formatHeaviest(personalBest)}
              />
              <StatCard
                label="Best est. 1RM"
                value={personalBest.bestEstimatedOneRepMax.value
                  ? `${Math.round(personalBest.bestEstimatedOneRepMax.value)} lb`
                  : 'N/A'}
              />
              <StatCard
                label="Best set"
                value={bestSet ? `${bestSet.weight ?? '-'} lb x ${bestSet.reps ?? '-'}` : 'N/A'}
              />
              <StatCard
                label="Trend"
                value={formatTrend(personalBest.recentTrend)}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Last 5 sessions</Text>
              {sessions.map((session) => {
                const widthPercent =
                  maxVolume > 0 ? Math.max(10, Math.round((session.totalVolume / maxVolume) * 100)) : 10;

                return (
                  <Pressable
                    key={session.sessionId}
                    onPress={() => router.push(`/workout/${session.sessionId}`)}
                    style={({ pressed }) => [styles.sessionCard, pressed && styles.buttonPressed]}
                  >
                    <View style={styles.sessionHeader}>
                      <Text style={styles.sessionDate}>{formatDate(session.loggedAt)}</Text>
                      <Text style={styles.sessionVolume}>
                        {Math.round(session.totalVolume)} lb volume
                      </Text>
                    </View>
                    <View style={styles.volumeTrack}>
                      <View style={[styles.volumeBar, { width: `${widthPercent}%` }]} />
                    </View>
                    <Text style={styles.sessionSets}>
                      {session.sets
                        .map((set) => `${set.weight ?? 'BW'} x ${set.reps ?? '-'}`)
                        .join(', ')}
                    </Text>
                    <Text style={styles.sessionSubtext}>
                      Top set {session.topWeight ?? 'N/A'} lb · Est. 1RM{' '}
                      {session.bestEstimatedOneRepMax
                        ? Math.round(session.bestEstimatedOneRepMax)
                        : 'N/A'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Personal best details</Text>
              <Text style={styles.detailLine}>
                Most reps at a given weight: {formatRepAtWeight(personalBest)}
              </Text>
              <Text style={styles.detailLine}>
                Highest session volume: {formatVolume(personalBest.highestSessionVolume.volume)}
              </Text>
              <Text style={styles.detailLine}>
                Most recent working weight:{' '}
                {personalBest.mostRecentWorkingWeight
                  ? `${personalBest.mostRecentWorkingWeight} lb`
                  : 'N/A'}
              </Text>
              <Text style={styles.detailLine}>
                Last performed: {formatDate(personalBest.lastPerformedDate)}
              </Text>
            </View>
          </View>
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

function formatRecommendationTarget(
  recommendation: ReturnType<typeof getProgressionRecommendation>,
) {
  if (recommendation.recommendedNextWeight === null) {
    return `Aim for ${recommendation.recommendedRepTarget}`;
  }

  return `Try ${recommendation.recommendedNextWeight} lb for ${recommendation.recommendedRepTarget}`;
}

function formatHeaviest(logs: ReturnType<typeof getExercisePersonalBest>) {
  if (!logs.heaviestWeight.weight) {
    return 'N/A';
  }

  if (logs.heaviestWeight.reps) {
    return `${logs.heaviestWeight.weight} lb x ${logs.heaviestWeight.reps}`;
  }

  return `${logs.heaviestWeight.weight} lb`;
}

function formatRepAtWeight(personalBest: ReturnType<typeof getExercisePersonalBest>) {
  if (!personalBest.bestRepAtWeight.weight || !personalBest.bestRepAtWeight.reps) {
    return 'N/A';
  }

  return `${personalBest.bestRepAtWeight.weight} lb x ${personalBest.bestRepAtWeight.reps}`;
}

function formatVolume(volume: number | null) {
  if (!volume) {
    return 'N/A';
  }

  return `${Math.round(volume)} lb`;
}

function formatTrend(trend: ReturnType<typeof getExercisePersonalBest>['recentTrend']) {
  if (trend === 'insufficient_data') {
    return 'Not enough data';
  }

  if (trend === 'up') {
    return 'Trending up';
  }

  if (trend === 'down') {
    return 'Trending down';
  }

  return 'Flat';
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
    gap: 16,
    paddingBottom: 40,
  },
  stateBlock: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 20,
  },
  stateText: {
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
    lineHeight: 20,
  },
  heroCard: {
    backgroundColor: '#111827',
    borderColor: '#1f2937',
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  cardLabel: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 32,
  },
  heroReason: {
    color: '#cbd5e1',
    fontSize: 15,
    lineHeight: 22,
  },
  heroMeta: {
    color: '#94a3b8',
    fontSize: 14,
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
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statValue: {
    color: '#f8fafc',
    fontSize: 20,
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
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  sessionCard: {
    backgroundColor: '#0b1220',
    borderColor: '#1f2937',
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    marginBottom: 12,
    padding: 14,
  },
  buttonPressed: {
    opacity: 0.84,
  },
  sessionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sessionDate: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
  },
  sessionVolume: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
  },
  volumeTrack: {
    backgroundColor: '#1f2937',
    borderRadius: 999,
    height: 10,
    overflow: 'hidden',
  },
  volumeBar: {
    backgroundColor: '#38bdf8',
    borderRadius: 999,
    height: '100%',
  },
  sessionSets: {
    color: '#e2e8f0',
    fontSize: 14,
    lineHeight: 20,
  },
  sessionSubtext: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
  },
  detailLine: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },
});
