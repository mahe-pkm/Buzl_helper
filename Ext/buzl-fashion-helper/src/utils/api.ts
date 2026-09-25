import { useCsvStore } from '../store/useCsvStore';

const trimTrailingSlash = (value: string) => value.trim().replace(/\/+$/, '');

const stripApiSuffix = (value: string) => {
  const clean = trimTrailingSlash(value);
  return clean.toLowerCase().endsWith('/api') ? clean.slice(0, -4) : clean;
};

const VPS_API_URL = 'https://api-buzl.213.210.37.204.sslip.io/api';
const LIVE_DASHBOARD_URL = 'https://buzl-admin-dashboard.vercel.app';

export function getBaseUrl(): string {
  const state = useCsvStore.getState();
  let url =
    state.serverEnvironment === 'development'
      ? state.vercelUrl
      : state.serverEnvironment === 'production'
        ? state.hostingerUrl
        : state.customUrl;

  // Clean trailing slashes and whitespace
  url = trimTrailingSlash(url);

  // Automatically upgrade dead legacy Supabase cloud Vercel backend to VPS
  if (url.includes('buzl-helper.vercel.app')) {
    url = VPS_API_URL;
  }

  // Proactively append /api if the user omitted it
  if (url && !url.endsWith('/api')) {
    url = `${url}/api`;
  }

  return url;
}

export function getDashboardUrl(): string {
  const state = useCsvStore.getState();
  const configuredUrl =
    state.serverEnvironment === 'development'
      ? state.dashboardVercelUrl
      : state.serverEnvironment === 'production'
        ? state.dashboardHostingerUrl
        : state.dashboardCustomUrl;

  const fallbackApiUrl =
    state.serverEnvironment === 'development'
      ? state.vercelUrl
      : state.serverEnvironment === 'production'
        ? state.hostingerUrl
        : state.customUrl;

  let selectedUrl = configuredUrl.trim() || fallbackApiUrl;
  
  // Automatically upgrade legacy dead dashboard domain
  if (selectedUrl.includes('buzl-dev.vercel.app') || selectedUrl.includes('buzl-helper.vercel.app')) {
    selectedUrl = LIVE_DASHBOARD_URL;
  }

  return stripApiSuffix(selectedUrl);
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
