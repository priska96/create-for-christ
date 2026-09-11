import { MESSAGES } from '@create-for-christ/contracts';
import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../api/request';
export function useMutation() {
  const lock = useRef(false);
  const active = useRef(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  async function run<T>(work: () => Promise<T>, success: (value: T) => void) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await work();
      if (active.current) success(result);
    } catch (cause) {
      if (active.current)
        setError(
          cause instanceof ApiError ? cause.message : MESSAGES.connection
        );
    } finally {
      lock.current = false;
      if (active.current) setBusy(false);
    }
  }
  return { busy, error, clearError: () => setError(''), run };
}
