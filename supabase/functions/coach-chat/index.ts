// @ts-ignore Deno import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts';

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

    // deno-lint-ignore no-explicit-any
    const OPENAI_API_KEY = (Deno as any).env.get('OPENAI_API_KEY');

    if (!OPENAI_API_KEY) {
      // No API key set yet — return a helpful mock so the pipeline can be tested
      return jsonResponse(getMockResponse(message));
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
        max_tokens: 600,
        temperature: 0.7,
      }),
    });

    if (!openAIRes.ok) {
      const errText = await openAIRes.text();
      console.error('OpenAI error:', openAIRes.status, errText);
      return errorResponse(502, `AI service error: ${openAIRes.status}`);
    }

    const completion = await openAIRes.json();
    const rawContent: string = completion.choices?.[0]?.message?.content ?? '{}';

    let parsed: Partial<CoachChatResponse>;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      console.error('Failed to parse OpenAI JSON:', rawContent);
      return errorResponse(502, 'AI returned an unexpected response format');
    }

    const response: CoachChatResponse = {
      reply: parsed.reply ?? 'I could not generate a response. Please try again.',
      safetyLevel: parsed.safetyLevel ?? 'normal',
      suggestedActions: parsed.suggestedActions ?? [],
      referencedData: parsed.referencedData ?? [],
    };

    return jsonResponse(response);
  } catch (err) {
    console.error('coach-chat error:', err);
    return errorResponse(500, err instanceof Error ? err.message : 'Internal server error');
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildUserContent(message: string, context: CoachChatRequest['context']): string {
  const sections: string[] = [];

  if (context.profile) {
    sections.push(`ATHLETE PROFILE:\n${JSON.stringify(context.profile, null, 1)}`);
  }

  sections.push(`RECENT TRAINING:\n${JSON.stringify(context.recentTraining, null, 1)}`);

  if (context.personalBests.length > 0) {
    sections.push(`TOP PERSONAL BESTS:\n${JSON.stringify(context.personalBests, null, 1)}`);
  }

  if (context.progressionRecommendations.length > 0) {
    sections.push(
      `PROGRESSION RECOMMENDATIONS:\n${JSON.stringify(context.progressionRecommendations, null, 1)}`,
    );
  }

  if (context.selectedExercise) {
    sections.push(
      `EXERCISE DRILL-DOWN:\n${JSON.stringify(context.selectedExercise, null, 1)}`,
    );
  }

  sections.push(`USER MESSAGE:\n${message}`);

  return sections.join('\n\n');
}

function getMockResponse(message: string): CoachChatResponse {
  const lower = message.toLowerCase();

  if (lower.includes('test') || lower.includes('hello') || lower.includes('connection')) {
    return {
      reply:
        'Connection verified. I am your AI training coach. Once OPENAI_API_KEY is set as a Supabase secret, I will respond using your real workout data. The full auth pipeline is working correctly.',
      safetyLevel: 'normal',
      suggestedActions: [
        'What should I do today?',
        'Summarize my week',
        'Should I increase weight?',
      ],
      referencedData: [],
    };
  }

  return {
    reply:
      'The AI coach backend is connected but OPENAI_API_KEY has not been set yet. Deploy the secret with: supabase secrets set OPENAI_API_KEY=sk-... and I will respond with real coaching based on your training data.',
    safetyLevel: 'normal',
    suggestedActions: ['What should I do today?', 'Summarize my week'],
    referencedData: [],
  };
}
