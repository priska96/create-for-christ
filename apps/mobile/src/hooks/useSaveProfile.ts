import type { Me } from '@create-for-christ/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveProfile } from '../api';
import { queryKeys } from '../query/client';
export function useSaveProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: saveProfile,
    onSuccess: (profile) => {
      client.setQueriesData<Me>({ queryKey: queryKeys.me }, (data) =>
        data ? { ...data, profile } : data
      );
      void client.invalidateQueries({ queryKey: queryKeys.me });
      void client.invalidateQueries({ queryKey: queryKeys.feed });
    },
  });
}
