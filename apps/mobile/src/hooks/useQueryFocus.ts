import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
export function useQueryFocus(refetch: () => Promise<unknown>, enabled = true) {
  const mounted = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (mounted.current && enabled) void refetch();
      mounted.current = true;
    }, [refetch, enabled])
  );
}
