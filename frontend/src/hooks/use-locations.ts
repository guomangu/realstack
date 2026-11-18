import { useCallback, useEffect, useState } from 'react';

import {
  fetchHealth,
  fetchLocations,
  type HealthResponse,
  type LocationItem,
} from '@/lib/api';

/** Hook asynchrone réutilisable : charge l'état API et les entités avec annulation propre. */
export function useStackOverview(limit = 20, initialQuery = '') {
  const [query, setQuery] = useState(initialQuery);
  const [refreshTick, setRefreshTick] = useState(0);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [items, setItems] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetchHealth(controller.signal).catch(() => null),
      fetchLocations({ q: query, limit, signal: controller.signal }),
    ])
      .then(([h, list]) => {
        if (controller.signal.aborted) return;
        if (h) setHealth(h);
        setItems(list.items);
        setError(null);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [limit, query, refreshTick]);

  const reload = useCallback((nextQuery?: string) => {
    setLoading(true);
    setError(null);
    if (nextQuery !== undefined) setQuery(nextQuery);
    setRefreshTick((n) => n + 1);
  }, []);

  return { health, items, loading, error, reload };
}
