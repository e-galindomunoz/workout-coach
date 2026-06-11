type SafetyLevel = 'normal' | 'caution' | 'stop';

type UnknownRecord = Record<string, unknown>;

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

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === 'object' ? (value as UnknownRecord) : null;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => asString(item)).filter(Boolean).slice(0, 8);
}

function detectSafetyLevel(text?: string | null): SafetyLevel {
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

function getSafetyNote(level: SafetyLevel): string | null {
  if (level === 'stop') {
    return 'Stop the workout and seek guidance from a healthcare professional before continuing.';
  }

  if (level === 'caution') {
    return 'Use caution, keep the session conservative, and stop if symptoms worsen or feel unusual.';
  }

  return null;
}

export function parseJsonObject(raw: string): UnknownRecord | null {
  try {
    const parsed = JSON.parse(raw);
    return asRecord(parsed);
  } catch {
    return null;
  }
}

export function inferSafetyLevel(text?: string | null): SafetyLevel {
  return detectSafetyLevel(text);
}

export function getPromptSafetyNote(text?: string | null): string | null {
  return getSafetyNote(detectSafetyLevel(text));
}

export function normalizeStringArray(value: unknown): string[] {
  return asStringArray(value);
}

export function normalizeSafetyLevel(value: unknown, fallback: SafetyLevel): SafetyLevel {
  return value === 'normal' || value === 'caution' || value === 'stop' ? value : fallback;
}

export function extractString(value: unknown, fallback = ''): string {
  return asString(value, fallback);
}

export function buildSafetyNote(level: SafetyLevel): string | null {
  return getSafetyNote(level);
}

