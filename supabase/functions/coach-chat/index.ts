// @ts-ignore Deno import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts';
import {
  buildSafetyNote,
  extractString,
  inferSafetyLevel,
  normalizeSafetyLevel,
  normalizeStringArray,
  parseJsonObject,
} from '../_shared/aiValidation.ts';

// ─── Types (mirror of client types/ai.ts) ─────────────────────────────────────

interface CoachChatRequest {
  message: string;
  context: {
    profile: Record<string, unknown> | null;
    recentTraining: Record<string, unknown>;
    personalBests: unknown[];
    progressionRecommendations: unknown[];
    selectedExercise?: Record<string, unknown>;
  };
}

interface CoachChatResponse {
  reply: string;
  safetyLevel: 'normal' | 'caution' | 'stop';
  suggestedActions: string[];
  referencedData: string[];
}

// ─── System prompt (static = cached by OpenAI) ────────────────────────────────

const SYSTEM_PROMPT = `You are a practical AI strength and fitness coach embedded in a workout tracking app. You have access to the user's real training data: workouts, personal bests, and progression analysis.

Your job:
- Answer questions about training, progress, and next steps
- Reference the user's actual numbers — never invent workouts, weights, or PRs
- Be concise and mobile-readable (short paragraphs, 3-6 sentences typical)
- When data is missing or insufficient, say so clearly
- Prefer specific recommendations with a brief reason
- Do not generate multi-week training plans

Safety rules:
- Sharp pain, chest pain, dizziness, fainting, numbness → safetyLevel "stop", tell user to stop and consult a medical professional
- Pain, unusual soreness, or fatigue mentioned → safetyLevel "caution", acknowledge and advise care
- Everything else → safetyLevel "normal"
- Never diagnose injuries or medical conditions

Always respond with a valid JSON object — no other text:
{
  "reply": "Your coaching response. Plain text, no markdown. Use line breaks for readability.",
  "safetyLevel": "normal",
  "suggestedActions": ["Follow-up question 1", "Follow-up question 2"],
  "referencedData": ["Bench Press: 185lb × 8", "trend: up"]
}

Fields:
- reply: direct, practical coaching response
- safetyLevel: "normal" | "caution" | "stop"
- suggestedActions: 2-3 natural follow-up questions the user might ask next
- referencedData: specific data points you cited (keep brief). Empty array if none.`;

function buildStaticSafetyResponse(level: 'caution' | 'stop'): CoachChatResponse {
  return {
    reply:
      level === 'stop'
        ? 'Stop the workout now and seek guidance from a healthcare professional before continuing.'
        : 'Keep the session conservative, avoid pushing through pain, and stop if symptoms worsen.',
    safetyLevel: level,
    suggestedActions:
      level === 'stop'
        ? ['Stop the workout', 'Seek professional guidance']
        : ['Reduce load', 'Keep the session lighter'],
    referencedData: [],
  };
}

function buildFallbackResponse(message: string, context: CoachChatRequest['context']): CoachChatResponse {
  const level = inferSafetyLevel(message);
  if (level !== 'normal') {
    return buildStaticSafetyResponse(level);
  }

  const recentTraining = context.recentTraining as { sessions?: unknown[] };
  const hasData =
    Boolean(context.profile) ||
    (Array.isArray(recentTraining.sessions) && recentTraining.sessions.length > 0) ||
    (context.personalBests?.length ?? 0) > 0 ||
    (context.progressionRecommendations?.length ?? 0) > 0 ||
    Boolean(context.selectedExercise);

  return {
    reply: hasData
      ? 'I could not parse the coach response. Please try again.'
      : 'Log a workout first, then ask again and I can coach from your recent training data.',
    safetyLevel: 'normal',
    suggestedActions: hasData
      ? ['Try again', 'Ask a shorter question']
      : ['Log a workout', 'Ask about your next target'],
    referencedData: [],
  };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

// deno-lint-ignore no-explicit-any
Deno.serve(async (req: any) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authenticated user
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

    const body: CoachChatRequest = await req.json();
    const { message, context } = body;

    if (!message?.trim()) {
      return errorResponse(400, 'message is required');
    }

    const detectedSafetyLevel = inferSafetyLevel(message);
    if (detectedSafetyLevel !== 'normal') {
      return jsonResponse(buildStaticSafetyResponse(detectedSafetyLevel));
    }

    // deno-lint-ignore no-explicit-any
    const OPENAI_API_KEY = (Deno as any).env.get('OPENAI_API_KEY');

    if (!OPENAI_API_KEY) {
      return jsonResponse(buildFallbackResponse(message, context));
    }

    // Build user message with context
    const userContent = buildUserContent(message, context);

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
        max_tokens: 280,
        temperature: 0.5,
      }),
    });

    if (!openAIRes.ok) {
      console.error('OpenAI error:', openAIRes.status);
      return jsonResponse(buildFallbackResponse(message, context));
    }

    const completion = await openAIRes.json();
    const rawContent: string = completion.choices?.[0]?.message?.content ?? '{}';

    const parsed = parseJsonObject(rawContent);
    if (!parsed) {
      console.error('Failed to parse OpenAI JSON response');
      return jsonResponse(buildFallbackResponse(message, context));
    }

    const response: CoachChatResponse = {
      reply:
        extractString(parsed.reply) ||
        buildFallbackResponse(message, context).reply,
      safetyLevel: normalizeSafetyLevel(
        parsed.safetyLevel,
        detectedSafetyLevel === 'normal' ? 'normal' : detectedSafetyLevel,
      ),
      suggestedActions: normalizeStringArray(parsed.suggestedActions).slice(0, 3),
      referencedData: normalizeStringArray(parsed.referencedData).slice(0, 4),
    };

    return jsonResponse(response);
  } catch (err) {
    console.error('coach-chat error:', err);
    return jsonResponse(buildFallbackResponse('Unexpected error', {
      profile: null,
      recentTraining: { workoutsThisWeek: 0, lastWorkoutDate: null, bodyWeightTrend: null, sessions: [] },
      personalBests: [],
      progressionRecommendations: [],
    }));
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildUserContent(message: string, context: CoachChatRequest['context']): string {
  const sections: string[] = [];

  if (context.profile) {
    sections.push(`ATHLETE PROFILE:\n${JSON.stringify(context.profile)}`);
  }

  sections.push(`RECENT TRAINING:\n${JSON.stringify(context.recentTraining)}`);

  if (context.personalBests.length > 0) {
    sections.push(`TOP PERSONAL BESTS:\n${JSON.stringify(context.personalBests)}`);
  }

  if (context.progressionRecommendations.length > 0) {
    sections.push(
      `PROGRESSION RECOMMENDATIONS:\n${JSON.stringify(context.progressionRecommendations)}`,
    );
  }

  if (context.selectedExercise) {
    sections.push(`EXERCISE DRILL-DOWN:\n${JSON.stringify(context.selectedExercise)}`);
  }

  sections.push(`USER MESSAGE:\n${message}`);
  sections.push(`SAFETY CONTEXT:\n${buildSafetyNote(inferSafetyLevel(message)) ?? 'none'}`);

  return sections.join('\n\n');
}
