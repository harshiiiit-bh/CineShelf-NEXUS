const configuredBase = String(import.meta.env.VITE_API_BASE_URL || '').trim();

export const API_BASE_URL = configuredBase.replace(/\/+$/, '');

const BACKEND_SETUP_MESSAGE =
  'The CineShelf multiplayer backend is not connected. Deploy server.ts to Google Cloud Run, then set the GitHub Actions repository variable VITE_API_BASE_URL to your Cloud Run HTTPS URL and rebuild the Pages site.';

function isGitHubPagesHost(): boolean {
  return typeof window !== 'undefined' && window.location.hostname.endsWith('.github.io');
}

export function assertApiConfigured(): void {
  if (!API_BASE_URL && isGitHubPagesHost()) {
    throw new Error(BACKEND_SETUP_MESSAGE);
  }
}

/** Build an API URL without accidentally sending requests to the GitHub Pages origin. */
export function apiUrl(path: string): string {
  assertApiConfigured();

  if (/^https?:\/\//i.test(path)) return path;
  if (!API_BASE_URL) return path;

  return new URL(path.replace(/^\//, ''), API_BASE_URL + '/').toString();
}

/** Fetch a CineShelf backend endpoint. Local development can continue using same-origin routes. */
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  assertApiConfigured();
  return fetch(apiUrl(path), init);
}

/** Build the WebSocket endpoint on the same backend host as the HTTP API. */
export function apiWebSocketUrl(path: string): string {
  assertApiConfigured();

  const base = API_BASE_URL || window.location.origin;
  const url = new URL(path.replace(/^\//, ''), base + '/');
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
