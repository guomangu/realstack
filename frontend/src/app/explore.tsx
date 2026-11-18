import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AsyncSection } from '@/components/async-section';
import { GlassSurface } from '@/components/glass-surface';
import { HarvestBubble } from '@/components/harvest-bubble';
import { LocationCard } from '@/components/location-card';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useStackOverview } from '@/hooks/use-locations';
import { useTheme } from '@/hooks/use-theme';

export default function ExploreScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [showHarvest, setShowHarvest] = useState(false);
  const { items, loading, error, reload } = useStackOverview(50);

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
        <View style={styles.rowBetween}>
          <ThemedText type="subtitle" style={styles.heading}>Explorer</ThemedText>
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowHarvest((open) => !open)}
            style={({ pressed }) => [styles.tag, { backgroundColor: theme.backgroundSelected }, pressed && styles.pressed]}>
            <ThemedText type="smallBold">+ Collecter</ThemedText>
          </Pressable>
        </View>
        {showHarvest && <HarvestBubble onAccepted={() => reload(query)} />}
        <GlassSurface style={styles.searchRow}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher un lieu par nom…"
            placeholderTextColor={theme.textSecondary}
            onSubmitEditing={() => reload(query)}
            style={[styles.input, { color: theme.text, borderColor: theme.glassBorder, backgroundColor: theme.backgroundElement }]}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => reload(query)}
            style={({ pressed }) => [styles.actionBtn, { backgroundColor: theme.accent }, pressed && styles.pressed]}>
            <ThemedText style={styles.btnText}>Chercher</ThemedText>
          </Pressable>
        </GlassSurface>
        <AsyncSection
          loading={loading}
          error={error}
          isEmpty={items.length === 0}
          emptyTitle="Aucun résultat trouvé"
          emptyDescription="Essayez un autre mot-clé ou déclenchez une collecte asynchrone."
          onRetry={() => reload(query)}>
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
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heading: { fontSize: 26, lineHeight: 34 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  input: { flex: 1, minHeight: 48, borderWidth: 1, borderRadius: Radius.input, paddingHorizontal: Spacing.three, fontSize: 17 },
  actionBtn: { minHeight: 48, paddingHorizontal: Spacing.three, borderRadius: Radius.input, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#f3f9ff', fontSize: 16, fontWeight: '600' },
  tag: { minHeight: 48, paddingHorizontal: Spacing.three, borderRadius: Radius.pill, justifyContent: 'center' },
  pressed: { opacity: 0.78 },
});
