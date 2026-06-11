import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, fontWeights, radius, shadows, spacing } from '../../lib/theme';

type FABAction = {
  label: string;
  onPress: () => void;
};

type FABProps = {
  actions: FABAction[];
};

export function FAB({ actions }: FABProps) {
  const [open, setOpen] = useState(false);

  return (
    <View pointerEvents={open ? 'auto' : 'box-none'} style={styles.overlay}>
      {open && <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />}
      <View style={styles.anchor}>
        {open && (
          <View style={styles.actions}>
            {[...actions].reverse().map((action) => (
              <Pressable
                key={action.label}
                onPress={() => {
                  setOpen(false);
                  action.onPress();
                }}
                style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
              >
                <Text style={styles.actionLabel}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        )}
        <Pressable
          onPress={() => setOpen((v) => !v)}
          style={({ pressed }) => [styles.button, shadows.glow, pressed && styles.buttonPressed]}
        >
          <Text style={styles.icon}>{open ? '×' : '+'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 100,
  },
  backdrop: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  anchor: {
    alignItems: 'center',
    bottom: spacing.xl,
    position: 'absolute',
    right: spacing.xl,
  },
  actions: {
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  action: {
    backgroundColor: colors.surface,
    borderColor: colors.accentBorder,
    borderRadius: radius.pill,
    borderWidth: 1,
    elevation: 8,
    paddingHorizontal: spacing.xl,
    paddingVertical: 13,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.36,
    shadowRadius: 12,
  },
  actionPressed: {
    opacity: 0.78,
  },
  actionLabel: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    elevation: 10,
    height: 60,
    justifyContent: 'center',
    width: 60,
  },
  buttonPressed: {
    opacity: 0.82,
  },
  icon: {
    color: '#0B0F0A',
    fontSize: 30,
    fontWeight: '400',
    lineHeight: 34,
    marginTop: -1,
  },
});
