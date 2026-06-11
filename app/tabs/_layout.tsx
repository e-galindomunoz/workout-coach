import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../components/AuthProvider';
import { LoadingScreen } from '../../components/LoadingScreen';
import { colors, fontSizes, fontWeights, radius, spacing } from '../../lib/theme';

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
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 8) + 8 }]}>
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
              style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
            >
              <View style={[styles.iconContainer, isFocused && styles.iconContainerActive]}>
                <Ionicons
                  name={isFocused ? (config?.icon ?? 'ellipse') : (config?.iconOutline ?? 'ellipse-outline')}
                  size={20}
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
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  bar: {
    alignItems: 'center',
    backgroundColor: colors.glassBar,
    borderColor: 'rgba(163, 190, 98, 0.20)',
    borderRadius: 32,
    borderWidth: 1,
    flexDirection: 'row',
    height: 62,
    justifyContent: 'space-around',
    paddingHorizontal: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 16,
    elevation: 14,
  },
  tab: {
    alignItems: 'center',
    flex: 1,
    gap: 3,
    justifyContent: 'center',
    paddingVertical: 6,
  },
  tabPressed: {
    opacity: 0.72,
  },
  iconContainer: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 30,
    justifyContent: 'center',
    width: 38,
  },
  iconContainerActive: {
    backgroundColor: 'rgba(163, 190, 98, 0.18)',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.30,
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    color: colors.textSoft,
    fontSize: 10,
    fontWeight: fontWeights.heavy,
    letterSpacing: 0.2,
  },
  labelActive: {
    color: colors.accent,
  },
});
