import { AppScreen } from './AppScreen';
import { LoadingState } from './ui/LoadingState';

type LoadingScreenProps = {
  message: string;
};

export function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <AppScreen
      title="Ironline"
      fillContent
      scrollEnabled={false}
    >
      <LoadingState message={message} />
    </AppScreen>
  );
}
