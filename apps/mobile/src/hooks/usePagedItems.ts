import { MESSAGES } from '@create-for-christ/contracts';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ApiError } from '../api/request';
export function usePagedItems<T extends { id: string }>(
  fetchPage: (
    cursor: string | undefined,
    signal: AbortSignal
  ) => Promise<{ items: T[]; nextCursor: string | null }>
) {
  const [items, setItems] = useState<T[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  const load = useCallback(
    async (cursor?: string) => {
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      setLoading(true);
      setError('');
      if (!cursor) {
        setItems([]);
        setNextCursor(null);
      }
      try {
        const page = await fetchPage(cursor, controller.signal);
        if (controller.signal.aborted) return;
        setItems((previous) =>
          cursor
            ? [
                ...previous,
                ...page.items.filter(
                  (item) =>
                    !previous.some((existing) => existing.id === item.id)
                ),
              ]
            : page.items
        );
        setNextCursor(page.nextCursor);
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(
            cause instanceof ApiError ? cause.message : MESSAGES.connection
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [fetchPage]
  );
  useFocusEffect(
    useCallback(() => {
      void load();
      return () => request.current?.abort();
    }, [load])
  );
  return {
    items,
    setItems,
    nextCursor,
    loading,
    error,
    reload: () => void load(),
    more: () => {
      if (nextCursor && !loading) void load(nextCursor);
    },
  };
}
