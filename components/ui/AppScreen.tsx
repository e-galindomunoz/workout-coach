import { PropsWithChildren } from 'react';
import {
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { colors, fontSizes, spacing } from '../../lib/theme';

type AppScreenProps = PropsWithChildren<{
  title: string;
  description: string;
  scrollEnabled?: boolean;
  fillContent?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentContainerStyle?: StyleProp<ViewStyle>;
  headerAccessory?: React.ReactNode;
  fab?: React.ReactNode;
}>;

export function AppScreen({
  title,
  description,
  children,
  scrollEnabled = true,
  fillContent = false,
  refreshing = false,
  onRefresh,
  contentContainerStyle,
  headerAccessory,
  fab,
}: AppScreenProps) {
  const content = (
    <View style={styles.container}>
      <View style={styles.headerCluster}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>Phase 1</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
        {headerAccessory ? <View>{headerAccessory}</View> : null}
      </View>

      <View style={[styles.content, fillContent && styles.contentFill, contentContainerStyle]}>
        {children}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.backgroundOrbPrimary} />
      <View style={styles.backgroundOrbSecondary} />
      {scrollEnabled ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.accent}
                colors={[colors.accent]}
                progressBackgroundColor={colors.surface}
              />
            ) : undefined
          }
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
      {fab}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  headerCluster: {
    gap: spacing.md,
  },
  headerText: {
    gap: spacing.xs,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: fontSizes.xs,
    fontWeight: '800',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: fontSizes.hero,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  description: {
    color: colors.textSoft,
    fontSize: fontSizes.md,
    lineHeight: 22,
    maxWidth: 460,
    marginTop: 2,
  },
  content: {
    gap: spacing.lg,
    marginTop: spacing.xl,
  },
  contentFill: {
    flex: 1,
  },
  backgroundOrbPrimary: {
    backgroundColor: '#2A3B18',
    borderRadius: 200,
    height: 240,
    opacity: 0.16,
    position: 'absolute',
    right: -80,
    top: -60,
    width: 240,
  },
  backgroundOrbSecondary: {
    backgroundColor: '#1A2810',
    borderRadius: 260,
    bottom: -140,
    height: 280,
    left: -100,
    opacity: 0.28,
    position: 'absolute',
    width: 280,
  },
});
