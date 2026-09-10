import {
  API_PATH,
  campaignListSchema,
  campaignPath,
  campaignDetailListSchema,
  campaignDetailSchema,
  campaignImageInputSchema,
  campaignInputSchema,
  meSchema,
  ownProfileSchema,
  type Campaign,
  type CampaignDetail,
  type CampaignInput,
  type DealType,
  type ProfileInput,
} from '@create-for-christ/contracts';
import { FILTER_ALL } from '../constants';

import { apiUrl } from '../auth-client';
import { authenticatedRequest } from './request';
export { ApiError } from './request';

export async function getCampaigns(
  deal: DealType | typeof FILTER_ALL,
  signal: AbortSignal
): Promise<Campaign[]> {
  const query = deal === FILTER_ALL ? '' : `?dealType=${deal}`;
  const response = await fetch(`${apiUrl}${API_PATH.campaigns}${query}`, {
    signal,
  });
  if (!response.ok)
    throw new Error('Die Kampagnen konnten gerade nicht geladen werden.');
  return campaignListSchema.parse(await response.json()).campaigns;
}

export async function getMe(signal?: AbortSignal) {
  return meSchema.parse(
    await authenticatedRequest(API_PATH.me, 'GET', undefined, signal)
  );
}
export async function saveProfile(input: ProfileInput) {
  return ownProfileSchema.parse(
    await authenticatedRequest(API_PATH.profile, 'PUT', input)
  );
}

export async function getBrandCampaigns(signal?: AbortSignal) {
  return campaignDetailListSchema.parse(
    await authenticatedRequest(
      API_PATH.brandCampaigns,
      'GET',
      undefined,
      signal
    )
  ).campaigns;
}
export async function createCampaign(
  input: CampaignInput
): Promise<CampaignDetail> {
  return campaignDetailSchema.parse(
    await authenticatedRequest(
      API_PATH.brandCampaigns,
      'POST',
      campaignInputSchema.parse(input)
    )
  );
}
export async function updateCampaign(
  id: string,
  input: CampaignInput
): Promise<CampaignDetail> {
  return campaignDetailSchema.parse(
    await authenticatedRequest(
      campaignPath(id),
      'PUT',
      campaignInputSchema.parse(input)
    )
  );
}
export async function publishCampaign(id: string): Promise<CampaignDetail> {
  return campaignDetailSchema.parse(
    await authenticatedRequest(campaignPath(id, 'publish'), 'POST')
  );
}
export async function closeCampaign(id: string): Promise<CampaignDetail> {
  return campaignDetailSchema.parse(
    await authenticatedRequest(campaignPath(id, 'close'), 'POST')
  );
}
export async function uploadCampaignImage(
  id: string,
  image: { mimeType: string; base64: string }
): Promise<CampaignDetail> {
  const parsed = campaignImageInputSchema.parse({
    mimeType: image.mimeType,
    data: image.base64,
  });
  return campaignDetailSchema.parse(
    await authenticatedRequest(campaignPath(id, 'image'), 'POST', parsed)
  );
}
