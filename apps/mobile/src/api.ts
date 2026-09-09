import { campaignListSchema, type Campaign, type DealType } from '@create-for-christ/contracts';

const apiUrl = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001').replace(/\/$/, '');
export async function getCampaigns(deal: DealType | 'all', signal: AbortSignal): Promise<Campaign[]> {
  const query = deal === 'all' ? '' : `?dealType=${deal}`;
  const response = await fetch(`${apiUrl}/v1/campaigns${query}`, { signal });
  if (!response.ok) throw new Error('Die Kampagnen konnten gerade nicht geladen werden.');
  return campaignListSchema.parse(await response.json()).campaigns;
}
