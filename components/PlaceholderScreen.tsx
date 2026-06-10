import { Link } from 'expo-router';
import { PropsWithChildren } from 'react';
import { StyleSheet } from 'react-native';
import { AppScreen } from './AppScreen';
import { EmptyState } from './ui/EmptyState';
import { colors, fontSizes, radius, spacing } from '../lib/theme';

type PlaceholderScreenProps = PropsWithChildren<{
  title: string;
  description: string;
}>;

export function PlaceholderScreen({
  title,
  description,
  children,
}: PlaceholderScreenProps) {
  return (
    <AppScreen title={title} description={description} fillContent>
      <EmptyState title={title} description={description} />
      {children}
    </AppScreen>
  );
}

export function ScreenLink({
  href,
  label,
}: {
  href: Parameters<typeof Link>[0]['href'];
  label: string;
}) {
  return (
    <Link href={href} style={styles.link}>
      {label}
    </Link>
  );
}

const styles = StyleSheet.create({
  link: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    color: colors.background,
    fontSize: fontSizes.lg,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
