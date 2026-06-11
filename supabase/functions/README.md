# Supabase Edge Functions

Three AI backend functions. The app calls these with the user's JWT — OpenAI key never leaves the server.

## Functions

| Function | Purpose |
|---|---|
| `coach-chat` | Conversational AI coach, returns reply + safety level + suggested actions |
| `workout-insight` | Analyze exercise or overall training, returns summary + insights |
| `adjust-workout` | Modify a workout on request, returns structured change list |

All functions:
- Require a valid user JWT (`Authorization: Bearer <token>`)
- Return mocked responses until `OPENAI_API_KEY` is set as a secret
- Handle CORS preflight (`OPTIONS`)
- Keep logs free of raw OpenAI keys or auth tokens
- Return safe fallbacks if OpenAI returns malformed JSON

---

## Prerequisites

Install the Supabase CLI:
```bash
brew install supabase/tap/supabase
```

Log in:
```bash
supabase login
```

Link this project (get `<project-ref>` from your Supabase dashboard URL):
```bash
supabase link --project-ref <project-ref>
```

---

## Deploy functions

Deploy all three at once:
```bash
supabase functions deploy coach-chat
supabase functions deploy workout-insight
supabase functions deploy adjust-workout
```

Or deploy a single one:
```bash
supabase functions deploy coach-chat --project-ref <project-ref>
```

Verify they're live in the Supabase dashboard under **Edge Functions**.

---

## Set OPENAI_API_KEY (Supabase secret)

Once you're ready to wire in real AI responses:

```bash
supabase secrets set OPENAI_API_KEY=sk-...
```

Verify it was stored:
```bash
supabase secrets list
```

The functions check `Deno.env.get('OPENAI_API_KEY')` — if the secret is present, they will call OpenAI. If not set, they return mock responses. This lets you test the pipeline before spending on API calls.

**Never put `OPENAI_API_KEY` in the Expo app or `.env` files committed to git.**

---

## Test the connection from the app

1. Deploy the functions (above)
2. Make sure `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are set in `.env`
3. Run the app:
   ```bash
   npx expo start -c
   ```
4. Log in with your account
5. Go to the **Coach** tab
6. Send a short message like `Summarize my week`
7. You should see a response card with the coach reply, safety level, and suggested actions

If you get a network error, check:
- Functions are deployed (Supabase dashboard → Edge Functions)
- You're logged in to the app (JWT is required)
- `EXPO_PUBLIC_SUPABASE_URL` matches your project URL
- `OPENAI_API_KEY` is set as a Supabase secret, not in the Expo app

---

## Local development (optional)

To run functions locally during development:
```bash
supabase functions serve
```

This starts a local server at `http://localhost:54321/functions/v1/`.
You can hit it directly with curl to test without deploying:

```bash
curl -i --location --request POST \
  'http://localhost:54321/functions/v1/coach-chat' \
  --header 'Authorization: Bearer <your-user-jwt>' \
  --header 'Content-Type: application/json' \
  --data '{"message":"Hello, run a connection test."}'
```

Get your JWT from the Supabase dashboard → Authentication → Users → any user → copy the JWT.
