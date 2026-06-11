export type SafetyLevel = 'normal' | 'caution' | 'stop';

const STOP_PHRASES = [
  'sharp pain',
  'chest pain',
  'fainting',
  'fainted',
  'dizziness',
  'dizzy',
  'numbness',
  'trouble breathing',
  'shortness of breath',
  'serious injury',
];

const CAUTION_PHRASES = [
  'pain',
  'sore',
  'soreness',
  'fatigue',
  'tired',
  'aches',
  'achy',
  'feels off',
];

export function detectSafetyLevel(text?: string | null): SafetyLevel {
  const normalized = text?.toLowerCase().trim();

  if (!normalized) {
    return 'normal';
  }

  if (STOP_PHRASES.some((phrase) => normalized.includes(phrase))) {
    return 'stop';
  }

  if (CAUTION_PHRASES.some((phrase) => normalized.includes(phrase))) {
    return 'caution';
  }

  return 'normal';
}

export function getSafetyNote(level: SafetyLevel): string | null {
  if (level === 'stop') {
    return 'Stop the workout and seek guidance from a healthcare professional before continuing.';
  }

  if (level === 'caution') {
    return 'Use caution, keep the session conservative, and stop if symptoms worsen or feel unusual.';
  }

  return null;
}

