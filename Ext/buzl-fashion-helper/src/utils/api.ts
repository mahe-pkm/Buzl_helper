import { useCsvStore } from '../store/useCsvStore';

export const PRODUCTION_API_URL = 'https://api-buzl.213.210.37.204.sslip.io/api';
export const LIVE_DASHBOARD_URL = 'https://buzl-admin-dashboard.vercel.app';

export function getBaseUrl(): string {
  return PRODUCTION_API_URL;
}

export function getDashboardUrl(): string {
  return LIVE_DASHBOARD_URL;
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
