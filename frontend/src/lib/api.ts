import { API_BASE_URL } from './config';

export interface HealthResponse {
  status: 'ok' | 'degraded';
  service: string;
  checks: { database: 'ok' | 'down'; redis: 'ok' | 'down' };
  timestamp: string;
}

export interface LocationItem {
  id: string;
  source: string;
  externalId: string;
  title: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  updatedAt: string;
  distanceMeters: number | null;
}

export interface LocationsResponse {
  items: LocationItem[];
  total: number;
  limit: number;
  offset: number;
}

export class ClientApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'ClientApiError';
  }
}

async function requestJson<T>(path: string, init: RequestInit = {}, timeoutMs = 8_000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const externalSignal = init.signal;
  const onAbort = () => controller.abort();
  externalSignal?.addEventListener('abort', onAbort, { once: true });

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { accept: 'application/json', ...init.headers },
    });
    const body = (await response.json().catch(() => null)) as
      | { error?: { code?: string; message?: string } }
      | null;
    if (!response.ok) {
      throw new ClientApiError(
        response.status,
        body?.error?.code ?? 'HTTP_ERROR',
        body?.error?.message ?? `Erreur serveur (${response.status}).`
      );
    }
    return body as T;
  } catch (error) {
    if (error instanceof ClientApiError) throw error;
    if (controller.signal.aborted && externalSignal?.aborted) throw error;
    throw new ClientApiError(0, 'NETWORK_ERROR', 'Serveur inaccessible. Vérifiez la connexion.');
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener('abort', onAbort);
  }
}

export function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return requestJson<HealthResponse>('/health', { signal });
}

export function fetchLocations(
  params: { q?: string; limit?: number; signal?: AbortSignal } = {}
): Promise<LocationsResponse> {
  const search = new URLSearchParams();
  search.set('limit', String(Math.min(Math.max(1, params.limit ?? 50), 200)));
  if (params.q?.trim()) search.set('q', params.q.trim());
  return requestJson<LocationsResponse>(`/api/locations?${search.toString()}`, { signal: params.signal });
}

export function triggerHarvest(adapter: string, externalId: string, signal?: AbortSignal) {
  return requestJson<{ status: string; queue: string; jobId: string }>(
    `/api/harvest/${encodeURIComponent(adapter)}`,
    {
      method: 'POST',
      signal,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ externalId: externalId.trim() }),
    }
  );
}
