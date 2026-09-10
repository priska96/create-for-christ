import { MESSAGES } from '@create-for-christ/contracts';
import { router } from 'expo-router';
import { useState } from 'react';
import { authClient } from './auth-client';
import { ROUTE } from './constants';

export function useSignOut() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function logout() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await authClient.signOut();
      if (result.error) {
        setError(MESSAGES.logoutFailed);
        return;
      }
      router.replace(ROUTE.home);
    } catch {
      setError(MESSAGES.connection);
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, logout };
}
