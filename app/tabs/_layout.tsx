import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../components/AuthProvider';
import { LoadingScreen } from '../../components/LoadingScreen';
import { colors, radius, spacing } from '../../lib/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_CONFIG: Record<string, { label: string; icon: IoniconName; iconOutline: IoniconName }> = {
  dashboard: { label: 'Home', icon: 'home', iconOutline: 'home-outline' },
  workout: { label: 'Train', icon: 'barbell', iconOutline: 'barbell-outline' },
  progress: { label: 'Progress', icon: 'stats-chart', iconOutline: 'stats-chart-outline' },
  coach: { label: 'Coach', icon: 'chatbubble-ellipses', iconOutline: 'chatbubble-ellipses-outline' },
  settings: { label: 'Settings', icon: 'settings', iconOutline: 'settings-outline' },
};

function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom + 10 }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const config = TAB_CONFIG[route.name];

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
              style={styles.tab}
            >
              <View style={[styles.iconContainer, isFocused && styles.iconContainerActive]}>
                <Ionicons
                  name={isFocused ? (config?.icon ?? 'ellipse') : (config?.iconOutline ?? 'ellipse-outline')}
                  size={21}
                  color={isFocused ? colors.accent : colors.textSoft}
                />
              </View>
              <Text style={[styles.label, isFocused && styles.labelActive]}>
                {config?.label ?? route.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { initialized, profileComplete, session } = useAuth();

  if (!initialized) {
    return <LoadingScreen message="Loading your account..." />;
  }

  if (!session) {
    return <Redirect href="/auth/login" />;
  }

  if (!profileComplete) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="workout" />
      <Tabs.Screen name="progress" />
      <Tabs.Screen name="coach" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.background,
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  bar: {
    alignItems: 'center',
    backgroundColor: colors.glassBar,
    borderColor: 'rgba(143, 175, 90, 0.18)',
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: 'row',
    height: 64,
    justifyContent: 'space-around',
    paddingHorizontal: spacing.sm,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 12,
  },
  tab: {
    alignItems: 'center',
    flex: 1,
    gap: 3,
    justifyContent: 'center',
    paddingVertical: 6,
  },
  iconContainer: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 30,
    justifyContent: 'center',
    width: 36,
  },
  iconContainerActive: {
    backgroundColor: 'rgba(143, 175, 90, 0.16)',
  },
  label: {
    color: colors.textSoft,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  labelActive: {
    color: colors.accent,
  },
});
