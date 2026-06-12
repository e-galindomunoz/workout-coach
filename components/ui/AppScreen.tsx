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
  Platform,
} from 'react-native';
import { useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, fontWeights, spacing } from '../../lib/theme';

type AppScreenProps = PropsWithChildren<{
  title: string;
  description?: string;
  showHeader?: boolean;
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
  showHeader = true,
  scrollEnabled = true,
  fillContent = false,
  refreshing = false,
  onRefresh,
  contentContainerStyle,
  headerAccessory,
  fab,
}: AppScreenProps) {
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const isTabsRoute = segments[0] === 'tabs';
  const bottomPadding = Math.max(insets.bottom, spacing.xxl) + (isTabsRoute ? 116 : 0);

  const content = (
    <View style={[styles.container, Platform.OS === 'web' && styles.webContainer, { paddingBottom: bottomPadding }]}>
      {showHeader ? (
        <View style={[styles.headerCluster, headerAccessory ? styles.headerClusterRow : undefined]}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>IRONLINE</Text>
            <Text style={styles.title}>{title}</Text>
            {description ? <Text style={styles.description}>{description}</Text> : null}
          </View>
          {headerAccessory ? <View style={styles.headerAccessory}>{headerAccessory}</View> : null}
        </View>
      ) : null}

      <View style={[styles.content, fillContent && styles.contentFill, contentContainerStyle]}>
        {children}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, Platform.OS === 'web' && styles.webViewport]}>
      <View style={styles.backgroundOrbPrimary} />
      <View style={styles.backgroundOrbSecondary} />
      {scrollEnabled ? (
        <ScrollView
          style={styles.scrollView}
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
  webViewport: {
    minHeight: '100%',
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    minHeight: '100%',
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    width: '100%',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    backgroundColor: colors.background,
  },
  webContainer: {
    maxWidth: 560,
    alignSelf: 'center',
  },
  headerCluster: {
    gap: spacing.sm,
  },
  headerClusterRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  headerAccessory: {
    paddingTop: spacing.sm,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.heavy,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: fontSizes.hero,
    fontWeight: fontWeights.heavy,
    letterSpacing: -0.8,
  },
  description: {
    color: colors.textSoft,
    fontSize: fontSizes.md,
    lineHeight: 22,
    marginTop: 2,
    maxWidth: 460,
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
    height: 280,
    opacity: 0.18,
    position: 'absolute',
    right: -80,
    top: -60,
    width: 280,
  },
  backgroundOrbSecondary: {
    backgroundColor: '#1A2810',
    borderRadius: 280,
    bottom: -160,
    height: 320,
    left: -120,
    opacity: 0.32,
    position: 'absolute',
    width: 320,
  },
});
