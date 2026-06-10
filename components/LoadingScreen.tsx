import { AppScreen } from './AppScreen';
import { LoadingState } from './ui/LoadingState';

type LoadingScreenProps = {
  message: string;
};

export function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <AppScreen
      title="One second"
      description="We’re syncing your session and preparing the app."
      fillContent
      scrollEnabled={false}
    >
      <LoadingState message={message} />
    </AppScreen>
  );
}
