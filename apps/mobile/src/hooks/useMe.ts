import { useQuery } from '@tanstack/react-query';
import { getMe } from '../api';
import { queryError, queryKeys } from '../query/client';
import { useQueryFocus } from './useQueryFocus';
export function useMe(userId?: string) {
  const query = useQuery({
    queryKey: [...queryKeys.me, userId],
    queryFn: ({ signal }) => getMe(signal),
    enabled: Boolean(userId),
  });
  useQueryFocus(query.refetch, Boolean(userId));
  return {
    me: query.data ?? null,
    loading: Boolean(userId) && query.isPending,
    error: queryError(query.error),
    retry: () => {
      void query.refetch();
    },
  };
}
