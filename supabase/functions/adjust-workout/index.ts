// @ts-ignore Deno import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AdjustWorkoutChange {
  type: 'swap' | 'sets' | 'reps' | 'rest' | 'intensity' | 'remove' | 'add';
  original: string;
  updated: string;
  reason: string;
}

interface WorkoutPatch {
  exercises: Array<{
    action: 'remove' | 'swap';
    exerciseName: string;
    replacedByName?: string;
  }>;
  addExercises?: Array<{
    name: string;
    muscleGroup?: string;
    targetSets?: number;
  }>;
}

interface AdjustWorkoutRequest {
  request: string;
  currentWorkout: {
    title: string;
    exercises: Array<{
      exerciseName: string;
      muscleGroup?: string;
      sets: Array<{ setNumber: number; weight: string | null; reps: string | null }>;
    }>;
  };
  completedSetsSoFar: Record<string, unknown>;
  profile?: Record<string, unknown> | null;
  recentTraining?: Record<string, unknown>;
  personalBests?: unknown[];
  progressionRecommendations?: unknown[];
}

interface AdjustWorkoutResponse {
  coachNote: string;
  changes: AdjustWorkoutChange[];
  updatedWorkoutPatch: WorkoutPatch | null;
  safetyNote: string | null;
}

// ─── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an AI strength coach helping a user adjust their active workout. Propose specific, practical changes.

Rules:
- Only change what is necessary for the user's request
- Reference actual exercise names from the provided workout
- coachNote: 1-2 sentences explaining your approach
- changes: each modification with type, original, updated, reason (be specific)
- updatedWorkoutPatch: only exercises that are removed, swapped, or added. Omit unchanged exercises. Set null if no structural changes needed (e.g. just reducing sets/reps).
- safetyNote: null unless serious symptoms are reported

SAFETY — If the user mentions sharp pain, chest pain, dizziness, fainting, or numbness:
- safetyNote: "Stop training immediately. These symptoms require medical evaluation. Do not continue until cleared by a healthcare professional."
- changes: []
- updatedWorkoutPatch: null

For general soreness/fatigue: modify intensity/volume, don't stop entirely.

updatedWorkoutPatch format (exercises array only includes changed ones):
{
  "exercises": [
    { "action": "remove", "exerciseName": "exact name from workout" },
    { "action": "swap", "exerciseName": "original name", "replacedByName": "replacement" }
  ],
  "addExercises": [
    { "name": "Exercise Name", "muscleGroup": "Shoulders", "targetSets": 3 }
  ]
}

Respond with JSON only — no other text:
{
  "coachNote": "...",
  "changes": [{ "type": "...", "original": "...", "updated": "...", "reason": "..." }],
  "updatedWorkoutPatch": { ... } | null,
  "safetyNote": null
}`;

// ─── Content builder ──────────────────────────────────────────────────────────

function buildUserContent(body: AdjustWorkoutRequest): string {
  const sections: string[] = [];

  sections.push(`ADJUSTMENT REQUEST: "${body.request}"`);
  sections.push(`CURRENT WORKOUT:\n${JSON.stringify(body.currentWorkout, null, 1)}`);

  if (body.profile) {
    sections.push(`ATHLETE PROFILE:\n${JSON.stringify(body.profile, null, 1)}`);
  }

  if (Array.isArray(body.personalBests) && body.personalBests.length > 0) {
    // Cap at 5 to keep context tight
    sections.push(`PERSONAL BESTS (top 5):\n${JSON.stringify(body.personalBests.slice(0, 5), null, 1)}`);
  }

  if (Array.isArray(body.progressionRecommendations) && body.progressionRecommendations.length > 0) {
    sections.push(`PROGRESSION TARGETS:\n${JSON.stringify(body.progressionRecommendations, null, 1)}`);
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

    const body: AdjustWorkoutRequest = await req.json();
    if (!body.request?.trim()) return errorResponse(400, 'request is required');
    if (!body.currentWorkout) return errorResponse(400, 'currentWorkout is required');

    // deno-lint-ignore no-explicit-any
    const OPENAI_API_KEY = (Deno as any).env.get('OPENAI_API_KEY');

    if (!OPENAI_API_KEY) {
      return jsonResponse(getMockAdjustment(body.request, body.currentWorkout));
    }

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
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 600,
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

    let parsed: Partial<AdjustWorkoutResponse>;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      console.error('Failed to parse OpenAI JSON:', rawContent);
      return errorResponse(502, 'AI returned an unexpected response format');
    }

    const response: AdjustWorkoutResponse = {
      coachNote: parsed.coachNote ?? 'Here is a suggested adjustment.',
      changes: parsed.changes ?? [],
      updatedWorkoutPatch: parsed.updatedWorkoutPatch ?? null,
      safetyNote: parsed.safetyNote ?? null,
    };

    return jsonResponse(response);
  } catch (err) {
    console.error('adjust-workout error:', err);
    return errorResponse(500, err instanceof Error ? err.message : 'Internal server error');
  }
});

// ─── Mock fallback ─────────────────────────────────────────────────────────────

function getMockAdjustment(
  request: string,
  currentWorkout: { exercises?: Array<{ exerciseName?: string }> },
): AdjustWorkoutResponse {
  const exercises = Array.isArray(currentWorkout.exercises) ? currentWorkout.exercises : [];
  const firstExercise = exercises[0]?.exerciseName ?? 'first exercise';
  const lower = request.toLowerCase();

  if (lower.includes('easier') || lower.includes('lighter') || lower.includes('tired') || lower.includes('sore')) {
    return {
      coachNote: "Backing off intensity today is the smart play — recovery is part of progress.",
      changes: [
        { type: 'intensity', original: `${firstExercise} at working weight`, updated: `${firstExercise} at ~80%`, reason: 'Match reduced energy level, prioritize form' },
        { type: 'sets', original: '4 sets', updated: '3 sets', reason: 'Lower volume on a recovery day' },
      ],
      updatedWorkoutPatch: null,
      safetyNote: null,
    };
  }

  if (lower.includes('shorter') || lower.includes('time') || lower.includes('35 min') || lower.includes('less time')) {
    return {
      coachNote: "Trimming to fit your time — keeping compound lifts, cutting accessories.",
      changes: [
        { type: 'remove', original: exercises[exercises.length - 1]?.exerciseName ?? 'last exercise', updated: 'Removed', reason: 'Cut accessory work to save time' },
        { type: 'sets', original: '4 sets per exercise', updated: '3 sets per exercise', reason: 'Reduce total session time' },
      ],
      updatedWorkoutPatch: null,
      safetyNote: null,
    };
  }

  return {
    coachNote: "Set OPENAI_API_KEY as a Supabase secret to get real AI-powered workout adjustments.",
    changes: [
      { type: 'sets', original: '3 × 10', updated: '4 × 8', reason: 'Mock adjustment — AI not connected yet' },
    ],
    updatedWorkoutPatch: null,
    safetyNote: null,
  };
}
