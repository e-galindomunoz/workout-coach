/**
 * Coach context builder.
 *
 * Assembles a compact, structured snapshot of the user's training data to
 * send as context to the AI coach. Cost control is critical here — we only
 * send summaries and caps, not raw database dumps.
 *
 * Budget per request:
 *   - Profile:             ~50 tokens
 *   - Recent training:    ~200 tokens  (5 sessions × summary)
 *   - Personal bests:     ~200 tokens  (top 8 only)
 *   - Progressions:       ~150 tokens  (top 5 actionable only)
 *   - Selected exercise:  ~150 tokens  (5 session history for one lift)
 *   Total context:       ~750 tokens
 */

import {
  getAllPersonalBests,
  getProgressionRecommendation,
  groupExerciseLogsByExercise,
} from './progression';
import {
  getAllExerciseLogs,
  getBodyMetrics,
  getProfile,
  getRecentWorkoutSessions,
} from './supabase';
import { calculateTotalVolume, getWorkoutsThisWeekCount } from './workouts';
import type { BodyMetric, ExerciseLog, PersonalBestSummary, WorkoutSession } from '../types/supabase';

// ─── Public types (consumed by coachApi + edge function) ─────────────────────

export type ProfileSummary = {
  name: string | null;
  goal: string | null;
  experience: string | null;
  daysPerWeek: number | null;
  preferredSplit: string | null;
  equipment: string[] | null;
  injuries: string | null;
};

export type SessionSummary = {
  title: string;
  date: string;
  durationMinutes: number | null;
  exercises: string[];
  totalVolumeLb: number;
};

export type RecentTrainingSummary = {
  workoutsThisWeek: number;
  lastWorkoutDate: string | null;
  bodyWeightTrend: string | null;
  sessions: SessionSummary[];
};

export type PersonalBestEntry = {
  exercise: string;
  heaviest: string | null;
  estimated1RM: string | null;
  trend: string;
  lastDate: string | null;
};

export type ProgressionEntry = {
  exercise: string;
  type: string;
  target: string;
  reason: string;
  confidence: string;
};

export type SelectedExerciseContext = {
  exerciseName: string;
  recentSessions: Array<{ date: string; sets: string[] }>;
  recommendation: { type: string; target: string; reason: string } | null;
};

export type CoachContext = {
  profile: ProfileSummary | null;
  recentTraining: RecentTrainingSummary;
  personalBests: PersonalBestEntry[];
  progressionRecommendations: ProgressionEntry[];
  selectedExercise?: SelectedExerciseContext;
};

// ─── Main entry point ────────────────────────────────────────────────────────

/**
 * Build the full context payload for the AI coach.
 * Pass the user's raw message so we can auto-detect exercise mentions and
 * include drill-down history for that specific lift.
 */
export async function getCoachContext(userMessage?: string): Promise<CoachContext> {
  // Fetch in parallel. Sessions limited to 5; logs fetch all but only summaries
  // are sent — raw logs are used only for local computation (progression, PRs).
  const [profileResult, metricsResult, sessionsResult, logsResult] = await Promise.all([
    getProfile(),
    getBodyMetrics(),
    getRecentWorkoutSessions(5),
    getAllExerciseLogs(),
  ]);

  const profile = profileResult.data ?? null;
  const metrics = metricsResult.data ?? [];
  const sessions = sessionsResult.data ?? [];
  const logs = logsResult.data ?? [];

  const personalBests = getAllPersonalBests(logs);
  const exerciseGroups = groupExerciseLogsByExercise(logs);

  // Detect if user is asking about a specific exercise so we can add depth
  const knownExerciseNames = personalBests.map((pb) => pb.exerciseName);
  const mentionedExercise = userMessage
    ? extractExerciseMention(userMessage, knownExerciseNames)
    : undefined;

  return {
    profile: profile ? buildProfileSummary(profile) : null,
    recentTraining: buildRecentTrainingSummary(sessions, logs, metrics),
    personalBests: getTopPersonalBestsSummary(personalBests),
    progressionRecommendations: getProgressionRecommendationsSummary(exerciseGroups),
    selectedExercise: mentionedExercise
      ? buildSelectedExerciseContext(mentionedExercise, logs)
      : undefined,
  };
}

// ─── Helpers (exported for testing / direct use) ─────────────────────────────

function buildProfileSummary(profile: NonNullable<Awaited<ReturnType<typeof getProfile>>['data']>): ProfileSummary {
  return {
    name: profile.name,
    goal: profile.main_goal,
    experience: profile.experience_level,
    daysPerWeek: profile.days_per_week,
    preferredSplit: profile.preferred_split,
    equipment: profile.equipment,
    injuries: profile.injuries,
  };
}

export function buildRecentTrainingSummary(
  sessions: WorkoutSession[],
  logs: ExerciseLog[],
  metrics: BodyMetric[],
): RecentTrainingSummary {
  const recent = sessions.slice(0, 5);

  // Compact weight trend: "185lb (+2.5 vs prev)" or just the latest
  let bodyWeightTrend: string | null = null;
  if (metrics.length >= 2 && metrics[0] && metrics[1]) {
    const delta = metrics[0].weight - metrics[1].weight;
    const sign = delta >= 0 ? '+' : '';
    bodyWeightTrend = `${metrics[0].weight}lb (${sign}${delta.toFixed(1)} vs prev)`;
  } else if (metrics.length === 1 && metrics[0]) {
    bodyWeightTrend = `${metrics[0].weight}lb`;
  }

  return {
    workoutsThisWeek: getWorkoutsThisWeekCount(sessions),
    lastWorkoutDate: recent[0]?.started_at ?? null,
    bodyWeightTrend,
    sessions: recent.map((session) => {
      const sessionLogs = logs.filter((l) => l.workout_session_id === session.id);
      // Cap exercise list at 6 per session to keep tokens compact
      const exerciseNames = [...new Set(sessionLogs.map((l) => l.exercise_name))].slice(0, 6);
      return {
        title: session.title,
        date: session.started_at,
        durationMinutes: session.duration_minutes,
        exercises: exerciseNames,
        totalVolumeLb: Math.round(calculateTotalVolume(sessionLogs)),
      };
    }),
  };
}

export function getTopPersonalBestsSummary(personalBests: PersonalBestSummary[]): PersonalBestEntry[] {
  // Top 8 by estimated 1RM — enough for the coach to reference, not so many we bloat the context
  return personalBests
    .filter((pb) => pb.heaviestWeight.weight !== null)
    .sort(
      (a, b) =>
        (b.bestEstimatedOneRepMax.value ?? 0) - (a.bestEstimatedOneRepMax.value ?? 0),
    )
    .slice(0, 8)
    .map((pb) => ({
      exercise: pb.exerciseName,
      heaviest: pb.heaviestWeight.weight
        ? `${pb.heaviestWeight.weight}lb${pb.heaviestWeight.reps ? ` × ${pb.heaviestWeight.reps}` : ''}`
        : null,
      estimated1RM: pb.bestEstimatedOneRepMax.value
        ? `${Math.round(pb.bestEstimatedOneRepMax.value)}lb`
        : null,
      trend: pb.recentTrend,
      lastDate: pb.lastPerformedDate,
    }));
}

export function getProgressionRecommendationsSummary(
  groups: Array<{ exerciseName: string; logs: ExerciseLog[] }>,
): ProgressionEntry[] {
  // Only actionable recommendations (not_enough_data excluded). Top 5 only.
  return groups
    .map((g) => getProgressionRecommendation(g.exerciseName, g.logs))
    .filter((r) => r.recommendationType !== 'not_enough_data')
    .slice(0, 5)
    .map((r) => ({
      exercise: r.exerciseName,
      type: r.recommendationType,
      target:
        r.recommendedNextWeight !== null
          ? `${r.recommendedNextWeight}lb × ${r.recommendedRepTarget}`
          : r.recommendedRepTarget,
      reason: r.reason,
      confidence: r.confidence,
    }));
}

export function buildSelectedExerciseContext(
  exerciseName: string,
  logs: ExerciseLog[],
): SelectedExerciseContext {
  const exerciseLogs = logs
    .filter((l) => l.exercise_name.toLowerCase() === exerciseName.toLowerCase())
    .sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime());

  // Group by session
  const bySession = new Map<string, ExerciseLog[]>();
  for (const log of exerciseLogs) {
    const existing = bySession.get(log.workout_session_id) ?? [];
    existing.push(log);
    bySession.set(log.workout_session_id, existing);
  }

  // Last 5 sessions for this exercise — enough context without bloating tokens
  const recentSessions = Array.from(bySession.values())
    .slice(0, 5)
    .map((sessionLogs) => ({
      date: sessionLogs[0]?.logged_at ?? '',
      sets: sessionLogs
        .sort((a, b) => a.set_number - b.set_number)
        .map((s) => {
          const parts: string[] = [];
          if (s.weight !== null) parts.push(`${s.weight}lb`);
          if (s.reps !== null) parts.push(`× ${s.reps}`);
          if (s.rpe !== null) parts.push(`@RPE ${s.rpe}`);
          if (s.pain_flag) parts.push('[pain flag]');
          return parts.join(' ') || 'bodyweight';
        }),
    }));

  const recommendation = getProgressionRecommendation(exerciseName, exerciseLogs);

  return {
    exerciseName,
    recentSessions,
    recommendation:
      recommendation.recommendationType !== 'not_enough_data'
        ? {
            type: recommendation.recommendationType,
            target:
              recommendation.recommendedNextWeight !== null
                ? `${recommendation.recommendedNextWeight}lb × ${recommendation.recommendedRepTarget}`
                : recommendation.recommendedRepTarget,
            reason: recommendation.reason,
          }
        : null,
  };
}

/** Check if the user's message mentions a specific exercise they've logged. */
export function extractExerciseMention(
  message: string,
  knownExercises: string[],
): string | undefined {
  const lower = message.toLowerCase();
  return knownExercises.find((name) => lower.includes(name.toLowerCase()));
}
