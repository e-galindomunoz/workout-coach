import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sendCoachMessage } from '../../lib/coachApi';
import { getCoachContext } from '../../lib/coachContext';
import { normalizeCoachChatResponse } from '../../lib/aiValidation';
import { clearCoachMessages, getCoachMessages, saveCoachMessage } from '../../lib/supabase';
import { colors, fontSizes, fontWeights, radius, spacing } from '../../lib/theme';
import type { CoachMessage } from '../../types/ai';

// ─── Quick prompts ────────────────────────────────────────────────────────────

const QUICK_PROMPTS = [
  'What should I do today?',
  'Summarize my week',
  'Should I increase weight?',
  'What lift should I focus on?',
  'Explain my progress',
  "What's my next target?",
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CoachScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [sendError, setSendError] = useState<string | null>(null);

  // Load history on mount
  useEffect(() => {
    void (async () => {
      const result = await getCoachMessages(60);
      setInitialLoading(false);
      if (result.data) {
        setMessages(
          result.data.map((row) => ({
            id: row.id,
            role: row.role as CoachMessage['role'],
            content: row.content,
            safetyLevel: (row.metadata?.safetyLevel as CoachMessage['safetyLevel']) ?? undefined,
            suggestedActions: (row.metadata?.suggestedActions as string[]) ?? undefined,
            referencedData: (row.metadata?.referencedData as string[]) ?? undefined,
            createdAt: row.created_at,
          })),
        );
      }
    })();
  }, []);

  // Scroll to end after new messages or loading bubble
  useEffect(() => {
    if (messages.length > 0 || sending) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages.length, sending]);

  const handleSend = useCallback(
    async (text: string = input.trim()) => {
      if (!text || sending) return;

      setInput('');
      setSendError(null);

      const userMsg: CoachMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: text,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setSending(true);

      // Persist user message (fire and forget — don't block the AI call)
      void saveCoachMessage({ role: 'user', content: text });

      // Build context — auto-detects any exercise mention in the message
      const context = await getCoachContext(text);

      const { data, error: aiError } = await sendCoachMessage(text, context);

      setSending(false);

      if (aiError || !data) {
        setSendError(
          aiError?.message ?? 'Could not reach the coach. Check your connection.',
        );
        return;
      }

      const normalized = normalizeCoachChatResponse(data, text);
      const assistantMsg: CoachMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: normalized.reply,
        safetyLevel: normalized.safetyLevel,
        suggestedActions: normalized.suggestedActions,
        referencedData: normalized.referencedData,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      void saveCoachMessage({
        role: 'assistant',
        content: normalized.reply,
        metadata: {
          safetyLevel: normalized.safetyLevel,
          suggestedActions: normalized.suggestedActions,
          referencedData: normalized.referencedData,
        },
      });
    },
    [input, sending],
  );

  function confirmClear() {
    Alert.alert(
      'Clear chat?',
      'This will delete your full conversation history with the coach.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            void clearCoachMessages();
            setMessages([]);
            setSendError(null);
          },
        },
      ],
    );
  }

  const hasMessages = messages.length > 0;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Background orbs matching rest of app */}
      <View style={styles.orbPrimary} />
      <View style={styles.orbSecondary} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.eyebrowRow}>
            <Ionicons name="barbell-outline" size={13} color={colors.accent} />
            <Text style={styles.headerEyebrow}>IRONLINE</Text>
          </View>
          <Text style={styles.headerTitle}>Coach</Text>
        </View>
        {hasMessages && (
          <Pressable onPress={confirmClear} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear history</Text>
          </Pressable>
        )}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Message list */}
        <ScrollView
          ref={scrollRef}
          style={styles.messageList}
          contentContainerStyle={[
            styles.messageListContent,
            !hasMessages && styles.messageListEmpty,
          ]}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        >
          {initialLoading ? (
            <ActivityIndicator color={colors.accent} style={styles.initialLoader} />
          ) : !hasMessages ? (
            <EmptyState onPromptPress={(p) => void handleSend(p)} />
          ) : (
            messages.map((msg) => <MessageBubble key={msg.id} message={msg} onAction={(p) => void handleSend(p)} />)
          )}

          {/* AI thinking indicator */}
          {sending && <LoadingBubble />}

          {/* Send error with retry */}
          {sendError && !sending && (
            <View style={styles.errorRow}>
              <Text style={styles.errorText}>{sendError}</Text>
              <Pressable
                onPress={() => {
                  setSendError(null);
                  // Retry with the last user message
                  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
                  if (lastUser) void handleSend(lastUser.content);
                }}
                style={styles.retryButton}
              >
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>

        {/* Quick prompts — horizontal scroll, always visible */}
        {hasMessages && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.promptsScroll}
            contentContainerStyle={styles.promptsContent}
            keyboardShouldPersistTaps="handled"
          >
            {QUICK_PROMPTS.map((prompt) => (
              <Pressable
                key={prompt}
                onPress={() => void handleSend(prompt)}
                style={({ pressed }) => [styles.promptChip, pressed && styles.promptChipPressed]}
              >
                <Text style={styles.promptChipText}>{prompt}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Input bar */}
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask your coach..."
            placeholderTextColor={colors.textSoft}
            multiline
            maxLength={600}
            returnKeyType="default"
            onSubmitEditing={() => void handleSend()}
          />
          <Pressable
            onPress={() => void handleSend()}
            disabled={!input.trim() || sending}
            style={({ pressed }) => [
              styles.sendButton,
              (!input.trim() || sending) && styles.sendButtonDisabled,
              pressed && styles.sendButtonPressed,
            ]}
          >
            {sending ? (
              <ActivityIndicator color={colors.background} size="small" />
            ) : (
              <Text style={styles.sendIcon}>↑</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EmptyState({ onPromptPress }: { onPromptPress: (p: string) => void }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyAvatar}>
        <Text style={styles.emptyAvatarText}>AI</Text>
      </View>
      <Text style={styles.emptyTitle}>Your AI Coach</Text>
      <Text style={styles.emptyBody}>
        Ask anything about your workouts, progress, or what to do next. I use your real training
        data — PRs, session history, and progression targets — not generic advice. Once you log
        workouts, I can ground answers in your recent logs and PRs.
      </Text>

      <Text style={styles.promptsLabel}>Try asking</Text>
      <View style={styles.emptyPromptGrid}>
        {QUICK_PROMPTS.map((prompt) => (
          <Pressable
            key={prompt}
            onPress={() => onPromptPress(prompt)}
            style={({ pressed }) => [styles.emptyPromptChip, pressed && styles.promptChipPressed]}
          >
            <Text style={styles.emptyPromptText}>{prompt}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function MessageBubble({
  message,
  onAction,
}: {
  message: CoachMessage;
  onAction: (prompt: string) => void;
}) {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.bubbleWrap, isUser ? styles.bubbleWrapUser : styles.bubbleWrapAssistant]}>
      {!isUser && (
        <View style={styles.assistantAvatar}>
          <Text style={styles.assistantAvatarText}>AI</Text>
        </View>
      )}
      <View style={styles.bubbleColumn}>
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
          {!isUser ? <Text style={styles.assistantLabel}>AI Coach</Text> : null}
          {/* Safety banner */}
          {!isUser && message.safetyLevel && message.safetyLevel !== 'normal' && (
            <View
              style={[
                styles.safetyBanner,
                message.safetyLevel === 'stop' ? styles.safetyStop : styles.safetyCaution,
              ]}
            >
              <Text style={styles.safetyBannerText}>
                {message.safetyLevel === 'stop' ? '⚠ Stop activity · Seek medical attention' : '⚠ Caution'}
              </Text>
            </View>
          )}

          <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant]}>
            {message.content}
          </Text>

          {/* Referenced data chips */}
          {!isUser && message.referencedData && message.referencedData.length > 0 && (
            <View style={styles.refDataRow}>
              {message.referencedData.map((item) => (
                <View key={item} style={styles.refDataChip}>
                  <Text style={styles.refDataText}>{item}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Suggested follow-up actions */}
        {!isUser && message.suggestedActions && message.suggestedActions.length > 0 && (
          <View style={styles.suggestionsRow}>
            {message.suggestedActions.map((action) => (
              <Pressable
                key={action}
                onPress={() => onAction(action)}
                style={({ pressed }) => [styles.suggestionChip, pressed && styles.promptChipPressed]}
              >
                <Text style={styles.suggestionText}>{action}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={[styles.timestamp, isUser && styles.timestampUser]}>
          {formatTime(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}

function LoadingBubble() {
  return (
    <View style={[styles.bubbleWrap, styles.bubbleWrapAssistant]}>
      <View style={styles.assistantAvatar}>
        <Text style={styles.assistantAvatarText}>AI</Text>
      </View>
      <View style={[styles.bubble, styles.bubbleAssistant, styles.loadingBubble]}>
        <ActivityIndicator color={colors.accent} size="small" />
        <Text style={styles.loadingText}>Thinking...</Text>
      </View>
    </View>
  );
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(iso));
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const AVATAR_SIZE = 28;

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.background,
    flex: 1,
  },
  flex: {
    flex: 1,
  },

  // Background orbs (matches AppScreen)
  orbPrimary: {
    backgroundColor: '#2A3B18',
    borderRadius: 200,
    height: 240,
    opacity: 0.16,
    position: 'absolute',
    right: -80,
    top: 0,
    width: 240,
  },
  orbSecondary: {
    backgroundColor: '#1A2810',
    borderRadius: 260,
    bottom: -140,
    height: 280,
    left: -100,
    opacity: 0.28,
    position: 'absolute',
    width: 280,
  },

  // Header
  header: {
    alignItems: 'flex-end',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  eyebrowRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  headerEyebrow: {
    color: colors.accent,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.heavy,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
  headerTitle: {
    color: colors.text,
    fontSize: fontSizes.hero,
    fontWeight: fontWeights.heavy,
    letterSpacing: -0.8,
  },
  clearButton: {
    paddingBottom: 4,
    paddingLeft: spacing.md,
  },
  clearButtonText: {
    color: colors.textSoft,
    fontSize: fontSizes.md,
    fontWeight: '700',
  },

  // Messages
  messageList: {
    flex: 1,
  },
  messageListContent: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  messageListEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  initialLoader: {
    marginTop: spacing.xxl,
  },

  // Bubbles
  bubbleWrap: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing.sm,
    maxWidth: '90%',
  },
  bubbleWrapUser: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  bubbleWrapAssistant: {
    alignSelf: 'flex-start',
  },
  bubbleColumn: {
    flex: 1,
    gap: spacing.xs,
  },
  bubble: {
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  bubbleUser: {
    backgroundColor: colors.surfaceAccent,
    borderColor: colors.borderAccent,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  assistantLabel: {
    color: colors.accent,
    fontSize: fontSizes.xs,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  bubbleText: {
    fontSize: fontSizes.md,
    lineHeight: 22,
  },
  bubbleTextUser: {
    color: colors.text,
  },
  bubbleTextAssistant: {
    color: colors.text,
  },
  loadingBubble: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
  },

  // Avatars
  assistantAvatar: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAccent,
    borderColor: colors.borderAccent,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 1,
    height: AVATAR_SIZE,
    justifyContent: 'center',
    marginBottom: 20,
    width: AVATAR_SIZE,
  },
  assistantAvatarText: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Safety banner
  safetyBanner: {
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  safetyCaution: {
    backgroundColor: colors.warningSurface,
  },
  safetyStop: {
    backgroundColor: colors.dangerSurface,
  },
  safetyBannerText: {
    color: colors.warning,
    fontSize: fontSizes.xs,
    fontWeight: '800',
  },

  // Referenced data
  refDataRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 2,
  },
  refDataChip: {
    backgroundColor: colors.surfaceCard,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  refDataText: {
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: '700',
  },

  // Suggested follow-up actions
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  suggestionChip: {
    backgroundColor: colors.surfaceCard,
    borderColor: colors.borderAccent,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  suggestionText: {
    color: colors.accent,
    fontSize: fontSizes.xs,
    fontWeight: '700',
  },

  // Timestamp
  timestamp: {
    color: colors.textSoft,
    fontSize: 11,
  },
  timestampUser: {
    textAlign: 'right',
  },

  // Error / retry
  errorRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  errorText: {
    color: colors.danger,
    flex: 1,
    fontSize: fontSizes.sm,
    lineHeight: 18,
  },
  retryButton: {
    borderColor: colors.danger,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  retryText: {
    color: colors.danger,
    fontSize: fontSizes.sm,
    fontWeight: '800',
  },

  // Quick prompts scroll (shown when chat has messages)
  promptsScroll: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexGrow: 0,
  },
  promptsContent: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  promptChip: {
    backgroundColor: colors.surfaceCard,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  promptChipPressed: {
    opacity: 0.72,
  },
  promptChipText: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },

  // Input bar
  inputBar: {
    alignItems: 'flex-end',
    backgroundColor: colors.glassBar,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.surfaceInput,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    flex: 1,
    fontSize: fontSizes.md,
    maxHeight: 120,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  sendButtonDisabled: {
    backgroundColor: colors.surfaceAlt,
  },
  sendButtonPressed: {
    opacity: 0.82,
  },
  sendIcon: {
    color: colors.background,
    fontSize: 18,
    fontWeight: '800',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  emptyAvatar: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAccent,
    borderColor: colors.borderAccent,
    borderRadius: 30,
    borderWidth: 1,
    height: 60,
    justifyContent: 'center',
    marginBottom: spacing.xs,
    width: 60,
  },
  emptyAvatarText: {
    color: colors.accent,
    fontSize: fontSizes.sm,
    fontWeight: '800',
    letterSpacing: 1,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: fontSizes.xl,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyBody: {
    color: colors.textMuted,
    fontSize: fontSizes.md,
    lineHeight: 24,
    maxWidth: 320,
    textAlign: 'center',
  },
  promptsLabel: {
    color: colors.textSoft,
    fontSize: fontSizes.xs,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: spacing.sm,
    textTransform: 'uppercase',
  },
  emptyPromptGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  emptyPromptChip: {
    backgroundColor: colors.surfaceCard,
    borderColor: colors.borderAccent,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
  },
  emptyPromptText: {
    color: colors.accent,
    fontSize: fontSizes.sm,
    fontWeight: '700',
  },
});
