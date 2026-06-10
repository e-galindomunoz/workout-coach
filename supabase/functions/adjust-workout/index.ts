// @ts-ignore Deno import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts';

interface AdjustWorkoutChange {
  type: 'swap' | 'sets' | 'reps' | 'rest' | 'intensity' | 'remove' | 'add';
  original: string;
  updated: string;
  reason: string;
}

interface AdjustWorkoutRequest {
  request: string;
  currentWorkout: Record<string, unknown>;
  context: Record<string, unknown>;
}

interface AdjustWorkoutResponse {
  coachNote: string;
  changes: AdjustWorkoutChange[];
  safetyNote: string | null;
}

// deno-lint-ignore no-explicit-any
Deno.serve(async (req: any) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse(401, 'Missing Authorization header');
    }

    const supabase = createClient(
      // deno-lint-ignore no-explicit-any
      (Deno as any).env.get('SUPABASE_URL') ?? '',
      // deno-lint-ignore no-explicit-any
      (Deno as any).env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse(401, 'Unauthorized');
    }

    const body: AdjustWorkoutRequest = await req.json();
    const { request, currentWorkout } = body;

    // Stage 8: uncomment to wire in OpenAI
    // const OPENAI_API_KEY = (Deno as any).env.get('OPENAI_API_KEY');
    // if (OPENAI_API_KEY) {
    //   const prompt = `The user wants to adjust their workout. Request: "${request}". Current workout: ${JSON.stringify(currentWorkout)}. Context: ${JSON.stringify(body.context)}. Return a structured list of changes as JSON.`;
    //   // ... call OpenAI and format response
    // }

    const response: AdjustWorkoutResponse = getMockAdjustment(request, currentWorkout);

    return jsonResponse(response);
  } catch (err) {
    return errorResponse(500, err instanceof Error ? err.message : 'Internal server error');
  }
});

function getMockAdjustment(
  request: string,
  currentWorkout: Record<string, unknown>,
): AdjustWorkoutResponse {
  const exercises = Array.isArray(currentWorkout.exercises)
    ? currentWorkout.exercises as Array<{ exerciseName?: string }>
    : [];
  const firstExercise = exercises[0]?.exerciseName ?? 'first exercise';
  const lower = request.toLowerCase();

  if (lower.includes('easier') || lower.includes('lighter') || lower.includes('tired')) {
    return {
      coachNote: "Backing off intensity today is smart — recovery is part of the program.",
      changes: [
        {
          type: 'intensity',
          original: `${firstExercise} at working weight`,
          updated: `${firstExercise} at 80% of working weight`,
          reason: 'Reduce load to match energy level and prioritize form',
        },
        {
          type: 'sets',
          original: '4 sets',
          updated: '3 sets',
          reason: 'Reduce volume on a lower-energy day',
        },
      ],
      safetyNote: null,
    };
  }

  if (lower.includes('harder') || lower.includes('more') || lower.includes('intense')) {
    return {
      coachNote: "Ready to push harder — let's add some productive overload.",
      changes: [
        {
          type: 'sets',
          original: '3 sets',
          updated: '4 sets',
          reason: 'Additional set to increase training volume',
        },
        {
          type: 'reps',
          original: '8-10 reps',
          updated: '6-8 reps at heavier load',
          reason: 'Higher intensity for strength focus',
        },
      ],
      safetyNote: null,
    };
  }

  return {
    coachNote: "Here's a balanced adjustment based on your request and recent training data.",
    changes: [
      {
        type: 'sets',
        original: `${firstExercise} — 3 × 10`,
        updated: `${firstExercise} — 4 × 8`,
        reason: 'Slightly higher intensity, better suited to your current progression',
      },
    ],
    safetyNote: null,
  };
}
