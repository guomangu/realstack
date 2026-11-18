import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { triggerHarvest } from '@/lib/api';
import { GlassSurface } from './glass-surface';
import { ThemedText } from './themed-text';

/** Bulle contextuelle (1 champ) pour déclencher une synchronisation asynchrone. */
export function HarvestBubble({ onAccepted }: { onAccepted?: () => void }) {
  const theme = useTheme();
  const [externalId, setExternalId] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!externalId.trim() || submitting) {
      if (!externalId.trim()) setStatus('Veuillez saisir un identifiant.');
      return;
    }
    setSubmitting(true);
    setStatus('Envoi de la tâche asynchrone…');
    try {
      const res = await triggerHarvest('example', externalId);
      setStatus(`Tâche acceptée (${res.queue}, job ${res.jobId.slice(0, 8)}).`);
      setExternalId('');
      onAccepted?.();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Échec de l’envoi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GlassSurface>
      <ThemedText type="smallBold">Déclencher une synchronisation (example)</ThemedText>
      <View style={styles.row}>
        <TextInput
          value={externalId}
          onChangeText={setExternalId}
          placeholder="Ex : lieu-42"
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.input,
            { color: theme.text, borderColor: theme.glassBorder, backgroundColor: theme.backgroundElement },
          ]}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => void submit()}
          style={({ pressed }) => [styles.btn, { backgroundColor: theme.accent }, pressed && styles.pressed]}>
          <ThemedText style={styles.btnText}>{submitting ? 'Envoi…' : 'Envoyer'}</ThemedText>
        </Pressable>
      </View>
      {status && <ThemedText type="small">{status}</ThemedText>}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  input: { flex: 1, minHeight: 48, borderWidth: 1, borderRadius: Radius.input, paddingHorizontal: Spacing.three, fontSize: 17 },
  btn: { minHeight: 48, paddingHorizontal: Spacing.three, borderRadius: Radius.input, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#f3f9ff', fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.78 },
});
