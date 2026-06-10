import { PropsWithChildren } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type AppScreenProps = PropsWithChildren<{
  title: string;
  description: string;
  scrollEnabled?: boolean;
  fillContent?: boolean;
}>;

export function AppScreen({
  title,
  description,
  children,
  scrollEnabled = true,
  fillContent = false,
}: AppScreenProps) {
  const content = (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>Workout Coach</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <View style={[styles.content, fillContent && styles.contentFill]}>
        {children}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {scrollEnabled ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  eyebrow: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: '#f8fafc',
    fontSize: 32,
    fontWeight: '700',
  },
  description: {
    color: '#cbd5e1',
    fontSize: 16,
    lineHeight: 24,
  },
  content: {
    gap: 16,
    marginTop: 8,
  },
  contentFill: {
    flex: 1,
  },
});
