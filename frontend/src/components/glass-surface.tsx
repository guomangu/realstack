import type { PropsWithChildren } from 'react';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type GlassSurfaceProps = PropsWithChildren<{
  style?: ViewStyle;
}>;

/**
 * Surface vitrée bleu clair inspirée des nuages, avec repli opaque lisible
 * et arrondis doux (20 px) sur Web, Android et iOS.
 */
export function GlassSurface({ children, style }: GlassSurfaceProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.surface,
        {
          backgroundColor: theme.glass,
          borderColor: theme.glassBorder,
        },
        Platform.OS === 'web' ? styles.webBlur : null,
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
    boxShadow: '0px 10px 28px rgba(74, 159, 232, 0.12)',
  },
  webBlur: {
    backdropFilter: 'blur(12px)',
  },
});
