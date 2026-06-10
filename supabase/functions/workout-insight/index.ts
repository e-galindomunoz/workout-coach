// @ts-ignore Deno import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface WorkoutInsightRequest {
  mode: 'post_workout' | 'exercise_detail';
  completedWorkout?: {
    title: string;
    durationMinutes: number | null;
    exercises: Array<{ name: string; totalSets: number; sets: string[] }>;
    newPRs: Array<{ exercise: string; label: string; previous: string; current: string }>;
  };
  exerciseName?: string;
  exerciseContext?: {
    exerciseName: string;
    recentSessions: Array<{ date: string; sets: string[] }>;
    recommendation: { type: string; target: string; reason: string } | null;
  };
  profile?: Record<string, unknown> | null;
  recentTraining?: Record<string, unknown>;
  progressionRecommendations?: unknown[];
}

interface WorkoutInsightResponse {
  summary: string;
  wins: string[];
  nextFocus: string;
  nextTargets: Array<{ exerciseName: string; target: string; reason: string }>;
  safetyNote: string | null;
}

// ─── System prompts ────────────────────────────────────────────────────────────

const POST_WORKOUT_SYSTEM = `You are a practical AI strength coach reviewing a completed workout. Use the data provided to give a useful, numbers-grounded debrief.

Your response:
- summary: 2-3 sentences covering the session overall
- wins: 1-4 specific highlights (new PRs, solid sets, consistent effort) — reference actual numbers
- nextFocus: 1 sentence, specific and actionable for next session
- nextTargets: only for exercises done today where a clear next step exists — use the progression targets if provided
- safetyNote: null unless pain was flagged — never diagnose injuries

Rules: Reference actual weights/reps/names. Do not fabricate data. Be direct, no generic praise.

JSON only:
{
  "summary": "...",
  "wins": ["..."],
  "nextFocus": "...",
  "nextTargets": [{ "exerciseName": "...", "target": "...", "reason": "..." }],
  "safetyNote": null
}`;

const EXERCISE_DETAIL_SYSTEM = `You are a practical AI strength coach analyzing an athlete's history on a specific exercise.

Your response:
- summary: 2-3 sentences on overall progress and trend
- wins: 1-3 specific positives (consistency, PRs, clean reps) — reference actual numbers
- nextFocus: 1 sentence — whether to repeat, increase, or fix form. Specific target if available.
- nextTargets: exactly 1 entry for this exercise
- safetyNote: null unless pain was flagged in history — never diagnose

Rules: Reference the actual history provided. Use deterministic recommendation as basis for nextTargets if given.

JSON only:
{
  "summary": "...",
  "wins": ["..."],
  "nextFocus": "...",
  "nextTargets": [{ "exerciseName": "...", "target": "...", "reason": "..." }],
  "safetyNote": null
}`;

// ─── Content builder ──────────────────────────────────────────────────────────

function buildUserContent(body: WorkoutInsightRequest): string {
  const sections: string[] = [];

  if (body.profile) {
    sections.push(`ATHLETE PROFILE:\n${JSON.stringify(body.profile, null, 1)}`);
  }

  if (body.mode === 'post_workout' && body.completedWorkout) {
    sections.push(`COMPLETED WORKOUT:\n${JSON.stringify(body.completedWorkout, null, 1)}`);
    if (body.progressionRecommendations && body.progressionRecommendations.length > 0) {
      sections.push(`PROGRESSION TARGETS:\n${JSON.stringify(body.progressionRecommendations, null, 1)}`);
    }
    if (body.recentTraining) {
      sections.push(`RECENT TRAINING CONTEXT:\n${JSON.stringify(body.recentTraining, null, 1)}`);
    }
  } else if (body.mode === 'exercise_detail') {
    if (body.exerciseName) sections.push(`EXERCISE: ${body.exerciseName}`);
    if (body.exerciseContext) {
      sections.push(`EXERCISE HISTORY:\n${JSON.stringify(body.exerciseContext, null, 1)}`);
    }
  }

  return sections.join('\n\n');
}

// ─── Handler ──────────────────────────────────────────────────────────────────

// deno-lint-ignore no-explicit-any
Deno.serve(async (req: any) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return errorResponse(401, 'Missing Authorization header');

    const supabase = createClient(
      // deno-lint-ignore no-explicit-any
      (Deno as any).env.get('SUPABASE_URL') ?? '',
      // deno-lint-ignore no-explicit-any
      (Deno as any).env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return errorResponse(401, 'Unauthorized');

    const body: WorkoutInsightRequest = await req.json();
    if (!body.mode) return errorResponse(400, 'mode is required');

    // deno-lint-ignore no-explicit-any
    const OPENAI_API_KEY = (Deno as any).env.get('OPENAI_API_KEY');

    if (!OPENAI_API_KEY) {
      return jsonResponse(getMockInsight(body));
    }

    const systemPrompt = body.mode === 'post_workout' ? POST_WORKOUT_SYSTEM : EXERCISE_DETAIL_SYSTEM;
    const userContent = buildUserContent(body);

    const openAIRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 500,
        temperature: 0.5,
      }),
    });

    if (!openAIRes.ok) {
      const errText = await openAIRes.text();
      console.error('OpenAI error:', openAIRes.status, errText);
      return errorResponse(502, `AI service error: ${openAIRes.status}`);
    }

    const completion = await openAIRes.json();
    const rawContent: string = completion.choices?.[0]?.message?.content ?? '{}';

    let parsed: Partial<WorkoutInsightResponse>;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      console.error('Failed to parse OpenAI JSON:', rawContent);
      return errorResponse(502, 'AI returned an unexpected response format');
    }

    const response: WorkoutInsightResponse = {
      summary: parsed.summary ?? 'Could not generate a summary.',
      wins: parsed.wins ?? [],
      nextFocus: parsed.nextFocus ?? '',
      nextTargets: parsed.nextTargets ?? [],
      safetyNote: parsed.safetyNote ?? null,
    };

    return jsonResponse(response);
  } catch (err) {
    console.error('workout-insight error:', err);
    return errorResponse(500, err instanceof Error ? err.message : 'Internal server error');
  }
});

// ─── Mock fallback ─────────────────────────────────────────────────────────────

function getMockInsight(body: WorkoutInsightRequest): WorkoutInsightResponse {
  if (body.mode === 'exercise_detail' && body.exerciseName) {
    return {
      summary: `${body.exerciseName} data loaded. Set OPENAI_API_KEY as a Supabase secret to get real AI analysis.`,
      wins: ['Exercise history retrieved', 'Deterministic targets computed'],
      nextFocus: 'Deploy OPENAI_API_KEY to unlock real coaching insights for this lift.',
      nextTargets: [],
      safetyNote: null,
    };
  }
  return {
    summary: 'Workout data received. Set OPENAI_API_KEY as a Supabase secret to get real post-workout AI analysis.',
    wins: ['Session logged successfully'],
    nextFocus: 'Deploy OPENAI_API_KEY to unlock real post-workout coaching.',
    nextTargets: [],
    safetyNote: null,
  };
}
