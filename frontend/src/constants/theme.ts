import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1f3a56',
    background: '#f3f9ff',
    backgroundElement: '#e3f2ff',
    backgroundSelected: '#cfe8ff',
    textSecondary: '#476582',
    accent: '#3b82c4',
    accentSoft: '#5aa9e6',
    glass: 'rgba(255, 255, 255, 0.72)',
    glassBorder: 'rgba(148, 197, 240, 0.55)',
    danger: '#b91c1c',
    dangerSoft: '#fee2e2',
    success: '#15803d',
    successSoft: '#dcfce7',
  },
  dark: {
    text: '#e8f3ff',
    background: '#0f172a',
    backgroundElement: '#1e293b',
    backgroundSelected: '#334155',
    textSecondary: '#9fb8d4',
    accent: '#5aa9e6',
    accentSoft: '#3b82c4',
    glass: 'rgba(30, 41, 59, 0.82)',
    glassBorder: 'rgba(90, 169, 230, 0.28)',
    danger: '#fca5a5',
    dangerSoft: 'rgba(185, 28, 28, 0.25)',
    success: '#86efac',
    successSoft: 'rgba(21, 128, 61, 0.25)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  input: 14,
  tag: 16,
  card: 20,
  pill: 9999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
