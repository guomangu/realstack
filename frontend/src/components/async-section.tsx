import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { GlassSurface } from './glass-surface';
import { ThemedText } from './themed-text';

interface AsyncSectionProps {
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  loadingLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  onRetry?: () => void;
  children: ReactNode;
}

/** Enveloppe asynchrone unifiée : états explicites loading, error (+ Réessayer), empty et success. */
export function AsyncSection({
  loading,
  error,
  isEmpty,
  loadingLabel = 'Chargement en cours…',
  emptyTitle = 'Aucune donnée disponible',
  emptyDescription = 'Les entités apparaîtront ici dès leur synchronisation.',
  onRetry,
  children,
}: AsyncSectionProps) {
  const theme = useTheme();

  if (loading && isEmpty) {
    return (
      <GlassSurface style={styles.centered}>
        <ActivityIndicator size="small" color={theme.accent} />
        <ThemedText style={styles.bodyText}>{loadingLabel}</ThemedText>
      </GlassSurface>
    );
  }
  if (error && isEmpty) {
    return (
      <GlassSurface style={{ ...styles.centered, backgroundColor: theme.dangerSoft }}>
        <ThemedText style={[styles.bodyText, { color: theme.danger }]}>{error}</ThemedText>
        {onRetry && (
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            style={({ pressed }) => [styles.retryButton, { backgroundColor: theme.accent }, pressed && styles.pressed]}>
            <ThemedText style={styles.retryText}>Réessayer</ThemedText>
          </Pressable>
        )}
      </GlassSurface>
    );
  }
  if (isEmpty) {
    return (
      <GlassSurface>
        <ThemedText type="smallBold">{emptyTitle}</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.bodyText}>{emptyDescription}</ThemedText>
      </GlassSurface>
    );
  }
  return (
    <View style={styles.content}>
      {loading && (
        <View style={styles.inlineSpinner}>
          <ActivityIndicator size="small" color={theme.accent} />
          <ThemedText themeColor="textSecondary" type="small">Actualisation…</ThemedText>
        </View>
      )}
      {error && <ThemedText style={[styles.bodyText, { color: theme.danger }]}>{error}</ThemedText>}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', paddingVertical: Spacing.four },
  content: { gap: Spacing.two },
  inlineSpinner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  bodyText: { fontSize: 17, lineHeight: 25, textAlign: 'center' },
  retryButton: {
    minHeight: 48,
    minWidth: 140,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryText: { color: '#f3f9ff', fontSize: 17, fontWeight: '600' },
  pressed: { opacity: 0.78 },
});
