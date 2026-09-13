import { APP } from '@create-for-christ/contracts';
import { Platform } from 'react-native';
import { apiUrl, authClient } from '../authClient';
import { TIMEOUT } from '../constants';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public issues: { path: string; message: string }[] = []
  ) {
    super(message);
  }
}
async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  if (Platform.OS !== 'web') {
    headers.Cookie = (await authClient.getCookie()) ?? '';
    headers.Origin = APP.origin;
  }
  return headers;
}
export async function authenticatedRequest(
  path: string,
  method: 'GET' | 'POST' | 'PUT',
  body?: unknown,
  signal?: AbortSignal
) {
  const headers: Record<string, string> = {
    ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...(await authHeaders()),
  };
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) abort();
  const timer = setTimeout(abort, TIMEOUT.requestMs);
  try {
    const response = await fetch(`${apiUrl}${path}`, {
      method,
      headers,
      signal: controller.signal,
      credentials: Platform.OS === 'web' ? 'include' : 'omit',
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const result = await response.json();
    if (!response.ok)
      throw new ApiError(
        response.status,
        typeof result.error === 'string'
          ? result.error
          : 'Die Anfrage ist fehlgeschlagen.',
        Array.isArray(result.issues)
          ? result.issues.filter(
              (issue: unknown): issue is { path: string; message: string } =>
                typeof issue === 'object' &&
                issue !== null &&
                'path' in issue &&
                typeof issue.path === 'string' &&
                'message' in issue &&
                typeof issue.message === 'string'
            )
          : []
      );
    return result;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
