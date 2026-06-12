# Ironline — Phase 2

iPhone-first workout tracking app. Built with Expo, React Native, TypeScript, Expo Router, and Supabase. Expo Go-compatible throughout.

Phase 2 adds AI coaching, workout insight, and workout adjustment on top of the Phase 1 logging stack.

## Phase 1 feature list

- Email/password signup and login
- Session restore on app reopen
- Auth-aware routing (login → onboarding → main tabs)
- Multi-step onboarding with editable fitness profile
- Body weight and waist logging with trend view
- Workout session creation and logging
- Set-by-set exercise tracking (weight, reps, RPE, notes, pain flag)
- Exercise catalog with suggestions while building a workout
- Duplicate-set shortcut for fast gym use
- Workout summaries with PR celebration
- Personal bests by exercise (heaviest, est. 1RM, reps, volume)
- Exercise detail pages with recent session history
- Deterministic progression recommendations (next weight/reps)
- Dashboard with hero stats, next target, and top PRs
- Premium dark olive UI with floating tab bar
- AI coach chat with safety-aware responses
- Workout insight and exercise insight
- Workout adjustment proposals before applying changes

## Prerequisites

- Node.js 20+
- npm
- Expo Go on iPhone
- A Supabase project

## Environment setup

Create `.env` in the project root:

```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Run in Expo Go

```bash
npx expo start -c
```

Your Mac and iPhone must be on the same Wi-Fi network. Scan the QR code with the iPhone Camera app or directly in Expo Go.

## Web / PWA / Vercel

Ironline also ships as a mobile-first web app and PWA.

### Local web

```bash
npx expo start --web
```

Expo Router uses a web dev server on `http://localhost:19006` by default. Use the LAN URL Expo prints if you want to open the app on an iPhone Safari browser while both devices are on the same Wi-Fi network.

### Production web build

```bash
npx expo export --platform web
```

- Output directory: `dist`
- App manifest and PWA metadata come from `app.json`
- `assets/icon.png` is used for the app icon

### Vercel

- Install command: `npm install`
- Build command: `npx expo export --platform web`
- Output directory: `dist`
- The repo includes [`vercel.json`](./vercel.json) with the build and SPA rewrite config

Required Vercel env vars:

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

Do not add `OPENAI_API_KEY` to Vercel client env vars. OpenAI stays in Supabase Edge Function secrets only.

### Supabase auth redirect URLs

Add these to your Supabase Auth redirect allow list:

- `http://localhost:19006`
- `https://YOUR-VERCEL-APP.vercel.app`
- `https://YOUR-VERCEL-APP.vercel.app/*` if you use preview or nested routes in redirects

If you use Vercel preview deployments, add each preview URL you plan to use as well.

### Add to Home Screen

On iPhone Safari:

1. Open the deployed Ironline URL.
2. Tap the Share button.
3. Tap Add to Home Screen.
4. Confirm the name and icon.

If the icon looks stale after a deploy, Safari is probably caching the pinned web app assets. Remove the existing home-screen app, reload the site in Safari, and add it again from Share → Add to Home Screen.

The PWA config uses the Ironline app name, the dark olive theme color, and `assets/icon.png`.

### Web testing checklist

Expo Go:

- `npx expo start -c`
- App still opens in Expo Go
- Auth works
- Workout logging works
- AI coach works

Local web:

- `npx expo start --web`
- Login/signup works
- Session persists after refresh
- Dashboard loads
- Workout logging works
- PRs and progression load
- Coach chat works
- Workout insight works
- Workout adjustment works

Vercel:

- Deploy the repo
- Set the two Expo public Supabase env vars
- Add the Vercel URL to Supabase redirect URLs
- Test auth
- Test workout logging
- Test AI coach
- Open on iPhone Safari
- Use Share → Add to Home Screen
- Confirm the icon and name look correct

## Supabase tables required

Run these in the Supabase SQL Editor:

- `supabase/migrations/20260610_create_profiles.sql`
- `supabase/migrations/20260610_create_body_metrics.sql`
- `supabase/migrations/20260610_create_workout_logging.sql`

Tables created:

- `profiles`
- `body_metrics`
- `workout_sessions`
- `exercise_logs`
- `exercise_catalog`

## Test flows

### Auth

1. Open the app — confirm redirect to Login when signed out.
2. Create an account or log in.
3. Close and reopen Expo Go — confirm session persists.

### Onboarding

1. Log in with an account that has no completed profile.
2. Confirm redirect to onboarding.
3. Complete the steps and confirm you land in the main tabs.
4. Open Settings → Edit profile — confirm edits save.

### Weight logging

1. Open Dashboard.
2. Log a body weight entry (with optional waist and notes).
3. Confirm the hero card updates with the latest weight.
4. Confirm the weight history list shows the new entry.
5. Open Progress — confirm the trend card updates.

### Workout logging

1. Open Workout or Dashboard → tap **Start Workout**.
2. Enter a workout title.
3. Add an exercise (type a name or pick from catalog suggestions).
4. Add sets with weight, reps, and optional RPE.
5. Use **Duplicate** on a set to confirm fast set cloning.
6. Tap **Finish Workout**.
7. Confirm the workout summary opens.

### PR tracking

1. Log a lift that beats a previous result.
2. Finish the workout — confirm **New PR** shows on the summary.
3. Open Progress → confirm the exercise appears in Personal Bests.
4. Tap the exercise — confirm the detail page shows heaviest, est. 1RM, best reps, best volume, and recent sessions.

### Progression recommendations

1. Log the same exercise across multiple sessions.
2. Start a new workout and add that exercise.
3. Confirm the exercise insight card shows: best, last performance, and a next target.
4. Tap **Apply to first set** — confirm the first set is prefilled.
5. Open Dashboard — confirm the **Next Target** card shows a recommendation.

### Phase 2 AI tests

1. Open the **Coach** tab.
2. Ask the coach to summarize the week.
3. Ask what to do next for a specific lift you have already logged.
4. Ask whether to increase weight on a lift with recent history.
5. Open a completed workout and ask for post-workout insight.
6. Open an exercise detail page and ask for exercise-specific insight.
7. Start a workout and use **Ask Coach to Adjust** because equipment is taken.
8. Test a safety phrase such as `sharp pain` and confirm the response is conservative and clearly warns you to stop.
9. Test a missing-data case with a new account or an exercise with no history.

## Design system

The visual identity lives in `lib/theme.ts`:

- Premium dark olive, blacks, and warm neutrals
- Olive green accents (`#8FAF5A`, `#A3BE62`) for active states, buttons, progress
- Bright olive-lime (`#C7E86B`) for PR moments and emphasis
- Glassmorphism-inspired `GlassCard` component for key cards
- Floating pill-style bottom navbar with Ionicons
- All colors, spacing, radius, font sizes, and card styles are centralized tokens

## Checks

```bash
npx expo-doctor
npx expo start -c
```

## Notes

- Expo Go-compatible throughout — no `expo-dev-client`, no EAS builds, no Apple Developer account needed.
- AI runs through Supabase Edge Functions only. `OPENAI_API_KEY` stays in Supabase secrets and never enters the Expo app.
- No native-only libraries. All dependencies work in Expo Go.

## Phase 2 AI deployment

Redeploy these after any Edge Function change:

```bash
supabase functions deploy coach-chat
supabase functions deploy workout-insight
supabase functions deploy adjust-workout
```
