# Workout Coach Stage 0

This repository contains the Stage 0 foundation for an iOS-first AI Workout Coach app built with Expo, React Native, TypeScript, and Expo Router.

Stage 0 only includes:

- Expo app configuration
- Expo Router route structure
- Expo Go-friendly local development setup
- iOS bundle identifier placeholder
- Placeholder screens and tab navigation

It does not include Supabase, OpenAI, or workout business logic yet.

## Prerequisites

- Node.js 20+
- npm
- Expo account
- Expo Go installed on your iPhone

## Setup

Run these commands from the project root:

```bash
npm install
npx expo start
```

## What each command does

- `npm install` installs project dependencies
- `npx expo start` starts the Expo development server for Expo Go

## Run on iPhone with Expo Go

1. Install Expo Go from the App Store on your iPhone.
2. Run `npx expo start` in this project.
3. Make sure your iPhone and Mac are on the same Wi-Fi network.
4. Scan the QR code with your iPhone Camera app or from inside Expo Go.
5. Confirm the app opens to the Home placeholder screen and that navigation works for Login, Signup, Onboarding, and all five tabs.

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
