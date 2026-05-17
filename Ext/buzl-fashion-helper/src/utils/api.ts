import { useCsvStore } from '../store/useCsvStore';

export function getBaseUrl(): string {
  const state = useCsvStore.getState();
  let url = '';
  if (state.serverEnvironment === 'development') {
    url = state.vercelUrl;
  } else if (state.serverEnvironment === 'production') {
    url = state.hostingerUrl;
  } else {
    url = state.customUrl;
  }

  // Clean trailing slashes and whitespace
  url = url.trim().replace(/\/+$/, '');

  // Proactively append /api if the user omitted it
  if (url && !url.endsWith('/api')) {
    url = `${url}/api`;
  }

  return url;
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
