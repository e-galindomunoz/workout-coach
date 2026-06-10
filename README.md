# Workout Coach Stage 5

This repository contains the current Expo Go-compatible foundation for an iOS-first AI Workout Coach app built with Expo, React Native, TypeScript, Expo Router, Supabase Auth, onboarding, body-weight logging, manual workout tracking, personal best tracking, and deterministic lift progression recommendations.

Current scope includes:

- Expo app configuration
- Expo Router route structure
- Expo Go-friendly local development setup
- Supabase email/password authentication
- Session persistence with AsyncStorage
- Auth-aware routing
- Multi-step onboarding profile form
- Editable profile flow from Settings
- Body weight logging on the Dashboard
- Latest weight and recent entries list
- Manual workout logging
- Workout sessions, exercise logs, and exercise catalog
- Workout summary and recent workout history
- Personal best tracking in Progress
- Exercise detail pages with recent sessions and next-weight recommendations
- Current PR card on the Dashboard
- Post-workout PR detection
- Logout from Settings

It does not include OpenAI or workout business logic yet.

## Prerequisites

- Node.js 20+
- npm
- Expo Go installed on your iPhone
- A Supabase project

## Environment setup

Create a `.env` file in the project root and add:

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

You can copy `.env.example` and fill it in with your project values from Supabase.

## Install and run

Run these commands from the project root:

```bash
npm install
npx expo start -c
```

## What each command does

- `npm install` installs project dependencies
- `npx expo start -c` starts the Expo development server for Expo Go and clears Metro cache

## Supabase database setup

Run the SQL from [supabase/migrations/20260610_create_profiles.sql](/Users/20edd49/projects/gym/supabase/migrations/20260610_create_profiles.sql) in the Supabase SQL Editor.

That migration:

- creates the `profiles` table
- enables Row Level Security
- adds per-user select/insert/update/delete policies
- adds an `updated_at` trigger

Also run the SQL from [supabase/migrations/20260610_create_body_metrics.sql](/Users/20edd49/projects/gym/supabase/migrations/20260610_create_body_metrics.sql).

That migration:

- creates the `body_metrics` table
- enables Row Level Security
- adds per-user select/insert/update/delete policies

Also run the SQL from [supabase/migrations/20260610_create_workout_logging.sql](/Users/20edd49/projects/gym/supabase/migrations/20260610_create_workout_logging.sql).

That migration:

- creates `workout_sessions`
- creates `exercise_logs`
- creates `exercise_catalog`
- enables Row Level Security on all three tables
- adds per-user select/insert/update/delete policies

## Onboarding routing

- Signed out users are redirected to Login.
- Signed in users without a completed `profiles` row are redirected to Onboarding.
- Signed in users with a completed profile are redirected to the main tabs.
- Settings includes an `Edit fitness profile` link that reuses the same profile form.
- The Dashboard shows the latest workout summary, workouts this week, latest body weight, and a `Start Workout` button.
- The Dashboard also shows a `Current PRs` card linking into Progress.
- The Workout tab shows `Start Workout`, quick stats, recent workout sessions, and now surfaces prior performance and next targets while building a workout.
- The Progress tab shows per-exercise personal best cards and exercise detail screens.

## Run on iPhone with Expo Go

1. Install Expo Go from the App Store on your iPhone.
2. Run `npx expo start -c` in this project.
3. Make sure your iPhone and Mac are on the same Wi-Fi network.
4. Scan the QR code with your iPhone Camera app or from inside Expo Go.
5. Confirm the app opens to the Login screen when signed out.
6. Create an account on the Signup screen or sign in on the Login screen.
7. If the user has no completed profile, confirm the app redirects to Onboarding.
8. Complete the onboarding steps and save the profile.
9. Confirm successful completion redirects to the main tabs.
10. Open Settings and use `Edit fitness profile` to update profile values.
11. On Dashboard, add a weight entry and confirm it appears in `Latest body weight` and `Recent entries`.
12. Open Workout and tap `Start Workout`.
13. Enter a workout title, add one or more exercises, and add sets with weight/reps/RPE.
14. Finish the workout and confirm you land on the workout summary screen.
15. Confirm the workout summary shows any new PRs detected from that session.
16. Go back to Workout and confirm the session appears in recent workout history.
17. Open Progress and confirm the exercised lifts appear with updated personal bests.
18. Open an exercise detail screen and confirm the last 5 sessions and next recommendation are shown.
19. Confirm the Dashboard shows the latest workout summary, updated workouts-this-week count, and the `Current PRs` card.
20. Open Settings and use Log out.
21. Sign back in, fully close Expo Go, reopen the app, and confirm the session is restored automatically.

## Later: EAS development builds

You do not need EAS development builds for the current Stage 0 setup.

If you add native modules later that are not supported in Expo Go, you can reintroduce Expo development builds and EAS build configuration at that time.

## Project structure

```text
app/
  _layout.tsx
  index.tsx
  auth/
    login.tsx
    signup.tsx
  onboarding/
    index.tsx
  tabs/
    _layout.tsx
    dashboard.tsx
    workout.tsx
    progress.tsx
    coach.tsx
    settings.tsx
  workout/
  exercise/

components/
lib/
types/
supabase/
```
