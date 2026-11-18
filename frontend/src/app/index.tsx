import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AsyncSection } from '@/components/async-section';
import { GlassSurface } from '@/components/glass-surface';
import { LocationCard } from '@/components/location-card';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useStackOverview } from '@/hooks/use-locations';
import { useTheme } from '@/hooks/use-theme';

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { health, items, loading, error, reload } = useStackOverview(20);

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.background }]}
      contentContainerStyle={[
        styles.container,
        {
          paddingTop: Platform.OS === 'web' ? 88 : insets.top + Spacing.three,
          paddingBottom: insets.bottom + BottomTabInset + Spacing.four,
        },
      ]}>
      <View style={styles.inner}>
        <View style={styles.headerRow}>
          <ThemedText type="subtitle" style={styles.heading}>The Universal Stack</ThemedText>
          <Pressable
            accessibilityRole="button"
            onPress={() => reload()}
            style={({ pressed }) => [styles.tagButton, { backgroundColor: theme.accent }, pressed && styles.pressed]}>
            <ThemedText style={styles.tagText}>Actualiser</ThemedText>
          </Pressable>
        </View>
        <GlassSurface>
          <ThemedText type="smallBold" style={styles.cardTitle}>État du système</ThemedText>
          <ThemedText style={styles.bodyText}>
            {health
              ? `API : ${health.status === 'ok' ? 'opérationnelle' : 'dégradée'} • Base : ${health.checks.database} • Redis : ${health.checks.redis}`
              : loading ? 'Vérification des services…' : 'Statut indisponible'}
          </ThemedText>
        </GlassSurface>
        <AsyncSection
          loading={loading}
          error={error}
          isEmpty={items.length === 0}
          loadingLabel="Chargement des données locales…"
          emptyTitle="Aucune entité synchronisée"
          emptyDescription="La base PostgreSQL/PostGIS est prête. Déclenchez une collecte dans Explorer."
          onRetry={() => reload()}>
          {items.map((item) => <LocationCard key={item.id} item={item} />)}
        </AsyncSection>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { alignItems: 'center', paddingHorizontal: Spacing.three },
  inner: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.three },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  heading: { fontSize: 26, lineHeight: 34, flexShrink: 1 },
  cardTitle: { fontSize: 18, lineHeight: 24 },
  bodyText: { fontSize: 17, lineHeight: 25 },
  tagButton: { minHeight: 48, paddingHorizontal: Spacing.three, borderRadius: Radius.pill, justifyContent: 'center', alignItems: 'center' },
  tagText: { color: '#f3f9ff', fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.78 },
});
