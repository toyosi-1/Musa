/**
 * Client-side fetch wrapper that automatically attaches the current user's
 * Firebase ID token as `Authorization: Bearer <idToken>`.
 *
 * Use this instead of bare `fetch(...)` for any API route protected by the
 * server-side `requireAuth` middleware.
 *
 * Usage:
 *
 *   const res = await fetchWithAuth('/api/vendors/seed', {
 *     method: 'POST',
 *     body: JSON.stringify({ estateId, vendors }),
 *   });
 *
 *   const data = await res.json();
 *
 * Behaviour:
 * - If the user is signed in, adds the token header and retries once on
 *   401 by forcing a token refresh (handles expiry gracefully).
 * - If the user is NOT signed in, calls fetch without the header — the
 *   server will return 401, which the caller can surface as a sign-in prompt.
 * - Content-Type header is set to `application/json` by default when a body
 *   is provided. Override via `init.headers` if you need something else.
 */
import { getFirebaseAuth } from './firebase';

export interface FetchWithAuthInit extends RequestInit {
  /**
   * If true (default), attempt one automatic retry with a refreshed token
   * when the first response is 401. Set to false to disable.
   */
  retryOn401?: boolean;
}

async function getIdTokenOrNull(forceRefresh = false): Promise<string | null> {
  try {
    const auth = await getFirebaseAuth();
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken(forceRefresh);
  } catch {
    return null;
  }
}

function buildHeaders(init: RequestInit | undefined, token: string | null): Headers {
  const headers = new Headers(init?.headers);

  // Default to JSON when a body is present and no content-type set.
  if (init?.body && !headers.has('content-type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return headers;
}

export async function fetchWithAuth(
  input: string | URL | Request,
  init: FetchWithAuthInit = {},
): Promise<Response> {
  const { retryOn401 = true, ...rest } = init;

  const token = await getIdTokenOrNull(false);
  const firstResponse = await fetch(input, {
    ...rest,
    headers: buildHeaders(rest, token),
  });

  // If the server rejected the token and we have one to retry, refresh once.
  if (firstResponse.status === 401 && retryOn401 && token) {
    const fresh = await getIdTokenOrNull(true);
    if (fresh && fresh !== token) {
      return fetch(input, {
        ...rest,
        headers: buildHeaders(rest, fresh),
      });
    }
  }

  return firstResponse;
}
