# Workout Coach Stage 1

This repository contains the current Expo Go-compatible foundation for an iOS-first AI Workout Coach app built with Expo, React Native, TypeScript, Expo Router, and Supabase Auth.

Current scope includes:

- Expo app configuration
- Expo Router route structure
- Expo Go-friendly local development setup
- Supabase email/password authentication
- Session persistence with AsyncStorage
- Auth-aware routing
- Logout from Settings
- Placeholder screens and tab navigation

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
npx expo start
```

## What each command does

- `npm install` installs project dependencies
- `npx expo start` starts the Expo development server for Expo Go

## Supabase database setup

Run the SQL from [supabase/migrations/20260610_create_profiles.sql](/Users/20edd49/projects/gym/supabase/migrations/20260610_create_profiles.sql) in the Supabase SQL Editor.

That migration:

- creates the `profiles` table
- enables Row Level Security
- adds per-user select/insert/update/delete policies
- adds an `updated_at` trigger

## Run on iPhone with Expo Go

1. Install Expo Go from the App Store on your iPhone.
2. Run `npx expo start` in this project.
3. Make sure your iPhone and Mac are on the same Wi-Fi network.
4. Scan the QR code with your iPhone Camera app or from inside Expo Go.
5. Confirm the app opens to the Login screen when signed out.
6. Create an account on the Signup screen or sign in on the Login screen.
7. Confirm successful sign-in redirects to the main tabs.
8. Open Settings and use Log out.
9. Sign back in, fully close Expo Go, reopen the app, and confirm the session is restored automatically.

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
