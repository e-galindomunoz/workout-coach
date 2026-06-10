import { PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { cardStyles, shadows } from '../../lib/theme';

type CardProps = PropsWithChildren<{
  accent?: boolean;
  elevated?: boolean;
  style?: StyleProp<ViewStyle>;
}>;

export function Card({ accent = false, elevated = false, style, children }: CardProps) {
  return (
    <View
      style={[
        cardStyles.base,
        elevated && cardStyles.elevated,
        accent && cardStyles.accent,
        shadows.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}
