import type { Me } from '@create-for-christ/contracts';
import { MESSAGES } from '@create-for-christ/contracts';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ApiError, getMe } from '../api';

export function useMe(userId?: string) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  useFocusEffect(
    useCallback(() => {
      if (!userId) {
        setMe(null);
        setLoading(false);
        return;
      }
      let active = true;
      const controller = new AbortController();
      setMe(null);
      setLoading(true);
      setError('');
      getMe(controller.signal)
        .then((value) => {
          if (active) setMe(value);
        })
        .catch((cause) => {
          if (active) {
            setError(
              cause instanceof ApiError ? cause.message : MESSAGES.connection
            );
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
        controller.abort();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps -- version is a manual refetch trigger, not read in the body.
    }, [userId, version])
  );
  return {
    me,
    loading,
    error,
    retry: () => setVersion((value) => value + 1),
  };
}
