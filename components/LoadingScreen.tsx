import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

type LoadingScreenProps = {
  message: string;
};

export function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator color="#38bdf8" size="large" />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#0f172a',
    flex: 1,
    gap: 16,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  message: {
    color: '#cbd5e1',
    fontSize: 16,
    textAlign: 'center',
  },
});
