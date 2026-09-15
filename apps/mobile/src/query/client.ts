import { AuthError } from '../api/auth';
import { QueryClient } from '@tanstack/react-query';
import { MESSAGES } from '@create-for-christ/contracts';
import { ApiError } from '../api/request';
export const QUERY = { staleMs: 30_000, gcMs: 300_000, retries: 1 } as const;
export const queryKeys = {
  me: ['me'],
  conversations: ['conversations'],
  messages: ['messages'],
  campaigns: ['campaigns'],
  discovery: ['discovery'],
  feed: ['feed'],
  applications: ['applications'],
} as const;
export function queryError(cause: unknown) {
  if (!cause) return '';
  return cause instanceof ApiError || cause instanceof AuthError
    ? cause.message
    : cause instanceof Error && cause.message === MESSAGES.logoutFailed
      ? MESSAGES.logoutFailed
      : MESSAGES.connection;
}
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: QUERY.staleMs,
        gcTime: QUERY.gcMs,
        retry: (count, error) =>
          count < QUERY.retries &&
          !(error instanceof ApiError && error.status < 500),
      },
      // Never replay an application, decision or auth action after reconnecting.
      mutations: { retry: false, networkMode: 'always', gcTime: 0 },
    },
  });
}
