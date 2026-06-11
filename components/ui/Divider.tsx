import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../../lib/theme';

type DividerProps = {
  style?: StyleProp<ViewStyle>;
};

export function Divider({ style }: DividerProps) {
  return <View style={[styles.line, style]} />;
}

const styles = StyleSheet.create({
  line: {
    backgroundColor: colors.border,
    height: 1,
    width: '100%',
  },
});
