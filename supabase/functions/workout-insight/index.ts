// @ts-ignore Deno import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts';

interface WorkoutInsightRequest {
  exerciseName?: string;
  context: Record<string, unknown>;
}

interface WorkoutInsightResponse {
  summary: string;
  insights: string[];
  nextFocus: string;
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

    const body: WorkoutInsightRequest = await req.json();
    const exerciseName = body.exerciseName;

    // Stage 8: uncomment to wire in OpenAI
    // const OPENAI_API_KEY = (Deno as any).env.get('OPENAI_API_KEY');
    // if (OPENAI_API_KEY) {
    //   const prompt = exerciseName
    //     ? `Provide a performance insight for ${exerciseName} based on this data: ${JSON.stringify(body.context)}`
    //     : `Provide a general workout insight based on: ${JSON.stringify(body.context)}`;
    //   // ... call OpenAI and format response
    // }

    const response: WorkoutInsightResponse = getMockInsight(exerciseName);

    return jsonResponse(response);
  } catch (err) {
    return errorResponse(500, err instanceof Error ? err.message : 'Internal server error');
  }
});

function getMockInsight(exerciseName?: string): WorkoutInsightResponse {
  if (exerciseName) {
    return {
      summary: `Your ${exerciseName} has been progressing steadily with consistent volume over recent sessions.`,
      insights: [
        'Volume load is trending upward — good progressive overload',
        'Rep consistency is strong across sets',
        'No pain flags logged for this movement',
      ],
      nextFocus: `Add 5 lb to your working weight on ${exerciseName} next session if last set felt manageable.`,
      safetyNote: null,
    };
  }

  return {
    summary: "You've been training consistently with solid progressive overload on your main compound lifts.",
    insights: [
      'Upper body push volume is ahead of pull — consider adding rows',
      'Leg day frequency looks good — 2x per week',
      'No pain flags in recent sessions — movement quality appears healthy',
    ],
    nextFocus: 'Prioritize your weakest movement pattern next session to maintain balance.',
    safetyNote: null,
  };
}
