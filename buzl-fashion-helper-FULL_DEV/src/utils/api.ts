const LEGACY_API_URL = "https://buzl-helper.vercel.app/api";
const VPS_API_URL = "https://api-buzl.213.210.37.204.sslip.io/api";

const configuredApiUrl = import.meta.env.VITE_API_URL;

export const API_URL = (!configuredApiUrl || configuredApiUrl === LEGACY_API_URL || configuredApiUrl === "/api")
  ? VPS_API_URL
  : configuredApiUrl;

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem("buzl_token");
  
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Error ${response.status}`);
  }
  return response.json();
}
