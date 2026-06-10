import { StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { Card } from '../../components/ui/Card';
import { Pill } from '../../components/ui/Pill';

export default function CoachScreen() {
  return (
    <AppScreen
      title="Coach"
      description="Your AI training coach is coming in Phase 2."
    >
      <Card accent style={styles.card}>
        <Pill label="Phase 2" tone="accent" />
        <Text style={styles.heading}>AI Coach</Text>
        <Text style={styles.body}>
          Phase 1 is focused on clean workout logging, personal bests, and deterministic progression recommendations. The AI coach arrives in Phase 2 — built on top of your real training history.
        </Text>
      </Card>

      <Card style={styles.comingSoon}>
        <Text style={styles.comingSoonLabel}>Planned for Phase 2</Text>
        {PHASE_2_FEATURES.map((feature) => (
          <View key={feature} style={styles.featureRow}>
            <View style={styles.dot} />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </Card>
    </AppScreen>
  );
}

const PHASE_2_FEATURES = [
  'Natural language workout analysis',
  'Personalized training plan generation',
  'Progress insights and trend explanations',
  'Adaptive periodization recommendations',
  'Recovery and readiness coaching',
];

const styles = StyleSheet.create({
  card: {
    gap: 14,
  },
  heading: {
    color: '#F4F1E8',
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 32,
  },
  body: {
    color: '#A8AA9B',
    fontSize: 15,
    lineHeight: 24,
  },
  comingSoon: {
    gap: 12,
  },
  comingSoonLabel: {
    color: '#6F7467',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  featureRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  dot: {
    backgroundColor: '#8FAF5A',
    borderRadius: 999,
    height: 6,
    opacity: 0.6,
    width: 6,
  },
  featureText: {
    color: '#A8AA9B',
    fontSize: 15,
    lineHeight: 22,
  },
});
