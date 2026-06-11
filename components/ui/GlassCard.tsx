import { PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { cardStyles, shadows } from '../../lib/theme';

type GlassCardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

export function GlassCard({ children, style }: GlassCardProps) {
  return (
    <View style={[cardStyles.glass, shadows.card, styles.padding, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  padding: {
    padding: 18,
  },
});
