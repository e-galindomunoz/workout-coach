import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, radius, spacing } from '../../lib/theme';

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
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
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
    borderColor: colors.borderAccent,
    borderRadius: radius.pill,
    borderWidth: 1,
    elevation: 6,
    paddingHorizontal: spacing.xl,
    paddingVertical: 13,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 10,
  },
  actionPressed: {
    opacity: 0.78,
  },
  actionLabel: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: '700',
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    elevation: 8,
    height: 60,
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    width: 60,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  icon: {
    color: colors.background,
    fontSize: 30,
    fontWeight: '400',
    lineHeight: 34,
    marginTop: -1,
  },
});
