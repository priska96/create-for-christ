import { mapPages, type ItemPages } from '../query/cache';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  FeedCampaign,
  ApplicationInput,
  ApplicationRecord,
  DealType,
} from '@create-for-christ/contracts';
import {
  applyToCampaign,
  decideApplication,
  dismissCampaign,
  getApplications,
  getBrandInbox,
  getCreatorFeed,
} from '../api/applications';
import { FILTER_ALL } from '../constants';
import { queryKeys } from '../query/client';
import { usePagedItems } from './usePagedItems';
export function useCreatorFeed(filter: DealType | typeof FILTER_ALL) {
  return usePagedItems([...queryKeys.feed, filter], async (cursor, signal) => {
    const result = await getCreatorFeed(
      { cursor, ...(filter === FILTER_ALL ? {} : { dealType: filter }) },
      signal
    );
    return { items: result.campaigns, nextCursor: result.nextCursor };
  });
}
export function useApplications(
  filter: ApplicationRecord['status'] | typeof FILTER_ALL,
  campaignId?: string,
  brandInbox = false
) {
  return usePagedItems(
    [...queryKeys.applications, { filter, campaignId, brandInbox }],
    async (cursor, signal) => {
      const query = {
        cursor,
        ...(filter === FILTER_ALL ? {} : { status: filter }),
      };
      const result = await (brandInbox
        ? getBrandInbox(query, signal)
        : getApplications(query, campaignId, signal));
      return { items: result.applications, nextCursor: result.nextCursor };
    }
  );
}
function useApplicationInvalidation() {
  const client = useQueryClient();
  return () => {
    for (const queryKey of [
      queryKeys.conversations,
      queryKeys.feed,
      queryKeys.applications,
      queryKeys.campaigns,
    ])
      void client.invalidateQueries({ queryKey });
  };
}
function useRemoveFeedCampaign() {
  const client = useQueryClient();
  return (id: string) => {
    void client.cancelQueries({ queryKey: queryKeys.feed });
    client.setQueriesData<ItemPages<FeedCampaign>>(
      { queryKey: queryKeys.feed },
      (data) =>
        mapPages(data, (items) => items.filter((item) => item.id !== id))
    );
  };
}
export function useApplyToCampaign() {
  const invalidate = useApplicationInvalidation();
  const remove = useRemoveFeedCampaign();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ApplicationInput }) =>
      applyToCampaign(id, input),
    onSuccess: (_result, { id }) => {
      remove(id);
      invalidate();
    },
  });
}
export function useDismissCampaign() {
  const invalidate = useApplicationInvalidation();
  const remove = useRemoveFeedCampaign();
  return useMutation({
    mutationFn: dismissCampaign,
    onSuccess: (_result, id) => {
      remove(id);
      invalidate();
    },
  });
}
export function useApplicationDecision() {
  const client = useQueryClient();
  const invalidate = useApplicationInvalidation();
  return useMutation({
    mutationFn: ({
      id,
      decision,
    }: {
      id: string;
      decision: 'accept' | 'reject';
    }) => decideApplication(id, decision),
    onSuccess: (application) => {
      void client.cancelQueries({ queryKey: queryKeys.applications });
      for (const query of client
        .getQueryCache()
        .findAll({ queryKey: queryKeys.applications })) {
        const filter = (query.queryKey[1] as { filter?: string } | undefined)
          ?.filter;
        client.setQueryData<ItemPages<ApplicationRecord>>(
          query.queryKey,
          (data) =>
            mapPages(data, (items) =>
              items
                .map((item) =>
                  item.id === application.id ? application : item
                )
                .filter(
                  (item) =>
                    !filter || filter === FILTER_ALL || item.status === filter
                )
            )
        );
      }
      invalidate();
    },
  });
}
