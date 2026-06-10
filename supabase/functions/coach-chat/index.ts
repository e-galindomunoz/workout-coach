// @ts-ignore Deno import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts';

interface CoachChatRequest {
  message: string;
  context?: Record<string, unknown>;
}

interface CoachChatResponse {
  reply: string;
  safetyLevel: 'normal' | 'caution' | 'stop';
  suggestedActions: string[];
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

    // Verify the caller is an authenticated user
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
    const message = body.message ?? '';

    // Stage 8: uncomment to wire in OpenAI
    // const OPENAI_API_KEY = (Deno as any).env.get('OPENAI_API_KEY');
    // if (OPENAI_API_KEY) {
    //   const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    //     method: 'POST',
    //     headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    //     body: JSON.stringify({
    //       model: 'gpt-4o-mini',
    //       messages: [
    //         { role: 'system', content: buildSystemPrompt(user.id) },
    //         { role: 'user', content: message },
    //       ],
    //     }),
    //   });
    //   const completion = await openAIResponse.json();
    //   const reply = completion.choices[0]?.message?.content ?? '';
    //   return jsonResponse({ reply, safetyLevel: 'normal', suggestedActions: [] });
    // }

    const response: CoachChatResponse = {
      reply: getMockReply(message),
      safetyLevel: 'normal',
      suggestedActions: [
        'Review your last workout',
        'Get a progression recommendation',
        'Ask about your next training day',
      ],
    };

    return jsonResponse(response);
  } catch (err) {
    return errorResponse(500, err instanceof Error ? err.message : 'Internal server error');
  }
});

function getMockReply(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('test') || lower.includes('hello') || lower.includes('connection')) {
    return "Connection established. I'm your AI training coach, backed by your real workout data. I can analyze your progress, suggest adjustments, and help you train smarter. OpenAI integration wires in next — this confirms the full auth pipeline is working.";
  }

  return "Got your message. I'm ready to help you train smarter. What would you like to work on today?";
}
