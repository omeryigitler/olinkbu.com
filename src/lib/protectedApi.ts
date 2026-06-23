import { auth } from './firebaseClient';
import { getClientAppCheckToken } from './appCheckClient';

type ProtectedApiOptions = Omit<RequestInit, 'body' | 'headers'> & {
  body?: unknown;
  headers?: HeadersInit;
};

function mergeHeaders(base: HeadersInit | undefined, additions: Record<string, string>) {
  const headers = new Headers(base || {});

  for (const [key, value] of Object.entries(additions)) {
    if (value) headers.set(key, value);
  }

  return headers;
}

export async function getProtectedApiHeaders(extraHeaders?: HeadersInit) {
  const currentUser = auth.currentUser;
  const idToken = currentUser ? await currentUser.getIdToken() : '';
  const appCheckToken = await getClientAppCheckToken();

  return mergeHeaders(extraHeaders, {
    ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    ...(appCheckToken ? { 'X-Firebase-AppCheck': appCheckToken } : {}),
  });
}

export async function protectedApiFetch<TResponse>(
  input: RequestInfo | URL,
  options: ProtectedApiOptions = {},
): Promise<TResponse> {
  const headers = await getProtectedApiHeaders(options.headers);

  if (options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(input, {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = typeof payload === 'object' && payload && 'error' in payload
      ? String((payload as { error: unknown }).error)
      : `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return payload as TResponse;
}
