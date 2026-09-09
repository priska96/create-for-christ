import { campaignListSchema, type Campaign, type DealType } from '@create-for-christ/contracts';

import { Platform } from 'react-native';
import { authClient, apiUrl } from './auth-client';
import { meSchema, ownProfileSchema, type ProfileInput } from '@create-for-christ/contracts';
export async function getCampaigns(deal: DealType | 'all', signal: AbortSignal): Promise<Campaign[]> {
  const query = deal === 'all' ? '' : `?dealType=${deal}`;
  const response = await fetch(`${apiUrl}/v1/campaigns${query}`, { signal });
  if (!response.ok) throw new Error('Die Kampagnen konnten gerade nicht geladen werden.');
  return campaignListSchema.parse(await response.json()).campaigns;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
async function authenticatedRequest(path: string, method: 'GET' | 'PUT', body?: unknown, signal?: AbortSignal) {
  const headers: Record<string,string> = { 'Content-Type': 'application/json' };
  if (Platform.OS !== 'web') {
    headers.Cookie = await authClient.getCookie() ?? '';
    headers.Origin = 'create-for-christ://';
  }
  const response = await fetch(`${apiUrl}${path}`, {
    method, headers, signal,
    credentials: Platform.OS === 'web' ? 'include' : 'omit',
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (!response.ok) throw new ApiError(response.status, typeof result.error === 'string' ? result.error : 'Die Anfrage ist fehlgeschlagen.');
  return result;
}
export async function getMe(signal?: AbortSignal) { return meSchema.parse(await authenticatedRequest('/v1/me','GET',undefined,signal)); }
export async function saveProfile(input: ProfileInput) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try { return ownProfileSchema.parse(await authenticatedRequest('/v1/me/profile','PUT',input,controller.signal)); }
  finally { clearTimeout(timer); }
}
