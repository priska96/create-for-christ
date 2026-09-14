import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { signOut } from '../api/auth';
import { ROUTE } from '../constants';
import { queryError } from '../query/client';
export function useSignOut() {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: signOut,
    onSuccess: async () => {
      await client.cancelQueries();
      client.clear();
      router.replace(ROUTE.home);
    },
  });
  return {
    busy: mutation.isPending,
    error: queryError(mutation.error),
    logout: () => {
      if (!mutation.isPending) mutation.mutate();
    },
  };
}
