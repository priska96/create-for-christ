import { useInfiniteQuery, type QueryKey } from '@tanstack/react-query';
import { queryError } from '../query/client';
import { useQueryFocus } from './useQueryFocus';
export function usePagedItems<T extends { id: string }>(
  queryKey: QueryKey,
  fetchPage: (
    cursor: string | undefined,
    signal: AbortSignal
  ) => Promise<{ items: T[]; nextCursor: string | null }>
) {
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam, signal }) => fetchPage(pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  useQueryFocus(query.refetch);
  const items = [
    ...new Map(
      (query.data?.pages.flatMap((page) => page.items) ?? []).map((item) => [
        item.id,
        item,
      ])
    ).values(),
  ];
  return {
    items,
    loading: query.isPending || query.isFetchingNextPage,
    error: queryError(query.error),
    nextCursor: query.hasNextPage,
    reload: () => {
      void query.refetch();
    },
    more: () => {
      if (query.hasNextPage && !query.isFetching) void query.fetchNextPage();
    },
  };
}
