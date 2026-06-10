import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/ErrorState';
import { GlassCard } from '../../components/ui/GlassCard';
import { Pill } from '../../components/ui/Pill';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { sendCoachMessage } from '../../lib/coachApi';
import { colors, fontSizes, spacing } from '../../lib/theme';
import type { CoachChatResponse } from '../../types/ai';

export default function CoachScreen() {
  const [result, setResult] = useState<CoachChatResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleTestConnection() {
    setLoading(true);
    setError(null);
    setResult(null);

    const { data, error: callError } = await sendCoachMessage(
      'Hello! Run a connection test.',
      { source: 'connection_test' },
    );

    setLoading(false);

    if (callError) {
      setError(callError.message);
      return;
    }

    setResult(data);
  }

  return (
    <AppScreen
      title="Coach"
      description="AI-powered training analysis backed by your real workout data."
    >
      {/* Hero */}
      <Card accent style={styles.heroCard}>
        <Text style={styles.heroTitle}>AI Coach</Text>
        <Text style={styles.heroBody}>
          Your coach reads your actual PRs, progression trends, and training history — not generic advice. The backend pipeline is secured through Supabase Edge Functions. Your OpenAI key never touches the app.
        </Text>
      </Card>

      {/* Connection test */}
      <Card style={styles.testCard}>
        <SectionHeader
          title="Backend connection"
          subtitle="Verify the secure AI pipeline is reachable from your account."
        />
        <Button
          label="Test AI Connection"
          loading={loading}
          onPress={() => void handleTestConnection()}
        />

        {error ? <ErrorState message={error} /> : null}

        {result ? (
          <GlassCard style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultLabel}>Coach replied</Text>
              <Pill
                label={result.safetyLevel}
                tone={result.safetyLevel === 'normal' ? 'success' : result.safetyLevel === 'caution' ? 'warning' : 'danger'}
              />
            </View>
            <Text style={styles.resultReply}>{result.reply}</Text>

            {result.suggestedActions.length > 0 && (
              <>
                <Text style={styles.actionsLabel}>Suggested next steps</Text>
                <View style={styles.actionsList}>
                  {result.suggestedActions.map((action) => (
                    <View key={action} style={styles.actionRow}>
                      <View style={styles.actionDot} />
                      <Text style={styles.actionText}>{action}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </GlassCard>
        ) : null}
      </Card>

      {/* Roadmap */}
      <Card style={styles.roadmapCard}>
        <SectionHeader title="Coming next" subtitle="Features unlocked once the pipeline is confirmed." />
        {ROADMAP.map((item) => (
          <View key={item} style={styles.roadmapRow}>
            <View style={styles.roadmapDot} />
            <Text style={styles.roadmapText}>{item}</Text>
          </View>
        ))}
      </Card>
    </AppScreen>
  );
}

const ROADMAP = [
  'Natural language workout analysis',
  'Personalized session adjustments',
  'Progress insights and trend explanations',
  'Adaptive periodization recommendations',
  'Recovery and readiness coaching',
];

const styles = StyleSheet.create({
  heroCard: {
    gap: spacing.md,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
  heroBody: {
    color: colors.textMuted,
    fontSize: fontSizes.md,
    lineHeight: 24,
  },
  testCard: {
    gap: spacing.md,
  },
  resultCard: {
    gap: spacing.md,
  },
  resultHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  resultLabel: {
    color: colors.textSoft,
    fontSize: fontSizes.xs,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  resultReply: {
    color: colors.text,
    fontSize: fontSizes.md,
    lineHeight: 24,
  },
  actionsLabel: {
    color: colors.textSoft,
    fontSize: fontSizes.xs,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: spacing.xs,
    textTransform: 'uppercase',
  },
  actionsList: {
    gap: spacing.sm,
  },
  actionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionDot: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    height: 6,
    opacity: 0.7,
    width: 6,
  },
  actionText: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    lineHeight: 20,
  },
  roadmapCard: {
    gap: spacing.md,
  },
  roadmapRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  roadmapDot: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    height: 6,
    opacity: 0.4,
    width: 6,
  },
  roadmapText: {
    color: colors.textMuted,
    fontSize: fontSizes.md,
    lineHeight: 22,
  },
});
