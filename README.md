# Workout Coach — Phase 1

iPhone-first workout tracking app. Built with Expo, React Native, TypeScript, Expo Router, and Supabase. Expo Go-compatible throughout.

Phase 2 will add the AI coach. It is not included in Phase 1.

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
- No AI or OpenAI integration. The AI coach is planned for Phase 2.
- No native-only libraries. All dependencies work in Expo Go.
