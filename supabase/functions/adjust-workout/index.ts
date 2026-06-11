// @ts-ignore Deno import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts';
import {
  buildSafetyNote,
  extractString,
  inferSafetyLevel,
  parseJsonObject,
} from '../_shared/aiValidation.ts';

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

function buildSafetyResponse(level: 'caution' | 'stop'): AdjustWorkoutResponse {
  return {
    coachNote:
      level === 'stop'
        ? 'Stop the workout now and seek professional guidance before continuing.'
        : 'Back off today, keep the session conservative, and stop if symptoms worsen.',
    changes: [],
    updatedWorkoutPatch: null,
    safetyNote: buildSafetyNote(level),
  };
}

function buildFallbackResponse(request: string): AdjustWorkoutResponse {
  const level = inferSafetyLevel(request);
  if (level !== 'normal') {
    return buildSafetyResponse(level);
  }

  return {
    coachNote: 'I could not parse the adjustment response. Please try again.',
    changes: [],
    updatedWorkoutPatch: null,
    safetyNote: null,
  };
}

// ─── Content builder ──────────────────────────────────────────────────────────

function buildUserContent(body: AdjustWorkoutRequest): string {
  const sections: string[] = [];

  sections.push(`ADJUSTMENT REQUEST: "${body.request}"`);
  sections.push(`CURRENT WORKOUT:\n${JSON.stringify(body.currentWorkout)}`);

  if (body.profile) {
    sections.push(`ATHLETE PROFILE:\n${JSON.stringify(body.profile)}`);
  }

  if (Array.isArray(body.personalBests) && body.personalBests.length > 0) {
    // Cap at 5 to keep context tight and predictable.
    sections.push(`PERSONAL BESTS (top 5):\n${JSON.stringify(body.personalBests.slice(0, 5))}`);
  }

  if (Array.isArray(body.progressionRecommendations) && body.progressionRecommendations.length > 0) {
    sections.push(`PROGRESSION TARGETS:\n${JSON.stringify(body.progressionRecommendations)}`);
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

    const detectedSafetyLevel = inferSafetyLevel(body.request);
    if (detectedSafetyLevel === 'stop') {
      return jsonResponse(buildSafetyResponse('stop'));
    }

    // deno-lint-ignore no-explicit-any
    const OPENAI_API_KEY = (Deno as any).env.get('OPENAI_API_KEY');

    if (!OPENAI_API_KEY) {
      return jsonResponse(buildFallbackResponse(body.request));
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
        max_tokens: 320,
        temperature: detectedSafetyLevel === 'caution' ? 0.35 : 0.45,
      }),
    });

    if (!openAIRes.ok) {
      console.error('OpenAI error:', openAIRes.status);
      return jsonResponse(buildFallbackResponse(body.request));
    }

    const completion = await openAIRes.json();
    const rawContent: string = completion.choices?.[0]?.message?.content ?? '{}';

    const parsed = parseJsonObject(rawContent);
    if (!parsed) {
      console.error('Failed to parse OpenAI JSON response');
      return jsonResponse(buildFallbackResponse(body.request));
    }

    const safetyNote = buildSafetyNote(detectedSafetyLevel);
    const parsedChanges = Array.isArray(parsed.changes)
      ? parsed.changes
          .map((item) => {
            if (!item || typeof item !== 'object') {
              return null;
            }

            const record = item as Record<string, unknown>;
            const type = extractString(record.type);
            const original = extractString(record.original);
            const updated = extractString(record.updated);
            const reason = extractString(record.reason);

            if (
              !type ||
              !original ||
              !updated ||
              !reason ||
              !['swap', 'sets', 'reps', 'rest', 'intensity', 'remove', 'add'].includes(type)
            ) {
              return null;
            }

            return {
              type: type as AdjustWorkoutChange['type'],
              original,
              updated,
              reason,
            };
          })
          .filter((item): item is AdjustWorkoutChange => Boolean(item))
          .slice(0, 6)
      : [];

    const parsedPatch = (() => {
      const patch = parsed.updatedWorkoutPatch;
      if (!patch || typeof patch !== 'object') {
        return null;
      }

      const record = patch as Record<string, unknown>;
      const exercises = Array.isArray(record.exercises)
        ? record.exercises
            .map((item) => {
              if (!item || typeof item !== 'object') {
                return null;
              }

              const change = item as Record<string, unknown>;
              const action = extractString(change.action);
              const exerciseName = extractString(change.exerciseName);
              const replacedByName = extractString(change.replacedByName);

              if ((action !== 'remove' && action !== 'swap') || !exerciseName) {
                return null;
              }

              if (action === 'swap' && !replacedByName) {
                return null;
              }

              return action === 'swap'
                ? { action, exerciseName, replacedByName }
                : { action, exerciseName };
            })
            .filter(
              (item): item is WorkoutPatch['exercises'][number] =>
                Boolean(item),
            )
        : [];

      const addExercises = Array.isArray(record.addExercises)
        ? record.addExercises
            .map((item) => {
              if (!item || typeof item !== 'object') {
                return null;
              }

              const add = item as Record<string, unknown>;
              const name = extractString(add.name);
              if (!name) {
                return null;
              }

              return {
                name,
                muscleGroup: extractString(add.muscleGroup) || undefined,
                targetSets:
                  typeof add.targetSets === 'number' && Number.isFinite(add.targetSets)
                    ? Math.max(1, Math.min(8, Math.round(add.targetSets)))
                    : undefined,
              };
            })
            .filter((item): item is NonNullable<typeof item> => Boolean(item))
        : [];

      if (exercises.length === 0 && addExercises.length === 0) {
        return null;
      }

      return {
        exercises,
        ...(addExercises.length > 0 ? { addExercises } : {}),
      } as WorkoutPatch;
    })();

    const response: AdjustWorkoutResponse = {
      coachNote:
        extractString(parsed.coachNote) ||
        buildFallbackResponse(body.request).coachNote,
      changes: parsedChanges,
      updatedWorkoutPatch: detectedSafetyLevel === 'stop' ? null : parsedPatch,
      safetyNote: extractString(parsed.safetyNote, safetyNote ?? '') || safetyNote,
    };

    return jsonResponse(response);
  } catch (err) {
    console.error('adjust-workout error:', err);
    return jsonResponse(buildFallbackResponse('Unexpected error'));
  }
});
