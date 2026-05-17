import { useCsvStore } from '../store/useCsvStore';

export function getBaseUrl(): string {
  const state = useCsvStore.getState();
  if (state.serverEnvironment === 'development') {
    return state.vercelUrl;
  } else if (state.serverEnvironment === 'production') {
    return state.hostingerUrl;
  } else {
    return state.customUrl;
  }
}

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const state = useCsvStore.getState();
  const token = state.token;
  const baseUrl = getBaseUrl();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${baseUrl}${endpoint}`, { ...options, headers });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Error ${response.status}`);
  }
  return response.json();
}
