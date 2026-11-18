import { StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { LocationItem } from '@/lib/api';
import { GlassSurface } from './glass-surface';
import { ThemedText } from './themed-text';

/** Carte unitaire d'une entité géolocalisée normalisée. */
export function LocationCard({ item }: { item: LocationItem }) {
  const theme = useTheme();
  const hasCoords = item.latitude !== null && item.longitude !== null;

  return (
    <GlassSurface>
      <View style={styles.header}>
        <ThemedText type="smallBold" style={styles.title}>
          {item.title}
        </ThemedText>
        <View style={[styles.badge, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText type="small" style={styles.badgeText}>
            {item.source}
          </ThemedText>
        </View>
      </View>
      <ThemedText themeColor="textSecondary" style={styles.body}>
        {item.description ?? 'Description indisponible depuis la source externe.'}
      </ThemedText>
      <ThemedText themeColor="textSecondary" type="small">
        {hasCoords
          ? `Position : ${item.latitude?.toFixed(4)}, ${item.longitude?.toFixed(4)}`
          : 'Coordonnées indisponibles'}
        {item.distanceMeters !== null ? ` • ${Math.round(item.distanceMeters)} m` : ''}
      </ThemedText>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  title: { fontSize: 18, lineHeight: 26, flexShrink: 1 },
  body: { fontSize: 16, lineHeight: 24 },
  badge: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, borderRadius: Radius.tag },
  badgeText: { fontSize: 13 },
});
