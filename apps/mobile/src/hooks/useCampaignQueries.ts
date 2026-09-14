import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CampaignDetail,
  CampaignInput,
  DealType,
} from '@create-for-christ/contracts';
import {
  closeCampaign,
  createCampaign,
  getBrandCampaigns,
  getCampaigns,
  publishCampaign,
  updateCampaign,
} from '../api';
import { FILTER_ALL } from '../constants';
import { queryKeys } from '../query/client';
import { useQueryFocus } from './useQueryFocus';
export function useBrandCampaigns(enabled = true) {
  const query = useQuery({
    queryKey: queryKeys.campaigns,
    queryFn: ({ signal }) => getBrandCampaigns(signal),
    enabled,
  });
  useQueryFocus(query.refetch, enabled);
  return query;
}
export function useDiscovery(filter: DealType | typeof FILTER_ALL) {
  const query = useQuery({
    queryKey: [...queryKeys.discovery, filter],
    queryFn: ({ signal }) => getCampaigns(filter, signal),
  });
  useQueryFocus(query.refetch);
  return query;
}
export function useCampaignInvalidation() {
  const client = useQueryClient();
  return (campaign?: CampaignDetail) => {
    if (campaign)
      client.setQueryData<CampaignDetail[]>(queryKeys.campaigns, (items) =>
        items
          ? items.some((item) => item.id === campaign.id)
            ? items.map((item) => (item.id === campaign.id ? campaign : item))
            : [campaign, ...items]
          : undefined
      );
    for (const queryKey of [
      queryKeys.campaigns,
      queryKeys.discovery,
      queryKeys.feed,
      queryKeys.applications,
    ])
      void client.invalidateQueries({ queryKey });
  };
}
export function useSaveCampaign() {
  const invalidate = useCampaignInvalidation();
  return useMutation({
    mutationFn: ({ id, input }: { id: string | null; input: CampaignInput }) =>
      id ? updateCampaign(id, input) : createCampaign(input),
    onSuccess: invalidate,
  });
}
export function useCampaignTransition() {
  const invalidate = useCampaignInvalidation();
  return useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      id: string;
      action: 'publish' | 'close';
    }) => (action === 'publish' ? publishCampaign(id) : closeCampaign(id)),
    onSuccess: invalidate,
  });
}
