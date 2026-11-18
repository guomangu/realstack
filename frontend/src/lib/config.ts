import { Platform } from 'react-native';

const DEFAULT_API_URL = 'http://localhost:3000';

/**
 * Résout l'URL de l'API depuis EXPO_PUBLIC_API_URL.
 * Sur émulateur Android, localhost désigne l'émulateur : on le mappe vers 10.0.2.2.
 */
export function resolveApiBaseUrl(
  rawUrl = process.env.EXPO_PUBLIC_API_URL,
  os = Platform.OS
): string {
  const base = (rawUrl?.trim() || DEFAULT_API_URL).replace(/\/+$/, '');
  if (os === 'android') {
    return base.replace(/^http:\/\/(localhost|127\.0\.0\.1)(?=[:/]|$)/, 'http://10.0.2.2');
  }
  return base;
}

export const API_BASE_URL = resolveApiBaseUrl();
