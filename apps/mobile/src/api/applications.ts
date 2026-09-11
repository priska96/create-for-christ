import {
  APPLICATION_PATH,
  applicationDecisionPath,
  applicationInputSchema,
  applicationPageSchema,
  applicationSchema,
  brandApplicationsPath,
  creatorCampaignActionPath,
  dismissalSchema,
  feedPageSchema,
  type ApplicationInput,
  type ApplicationQuery,
  type FeedQuery,
} from '@create-for-christ/contracts';
import { authenticatedRequest } from './request';
function queryPath(path: string, query: FeedQuery | ApplicationQuery) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query))
    if (value !== undefined) params.set(key, value);
  return params.size ? `${path}?${params}` : path;
}
export async function getCreatorFeed(query: FeedQuery, signal?: AbortSignal) {
  return feedPageSchema.parse(
    await authenticatedRequest(
      queryPath(APPLICATION_PATH.feed, query),
      'GET',
      undefined,
      signal
    )
  );
}
export async function applyToCampaign(id: string, input: ApplicationInput) {
  return applicationSchema.parse(
    await authenticatedRequest(
      creatorCampaignActionPath(id, 'applications'),
      'POST',
      applicationInputSchema.parse(input)
    )
  );
}
export async function dismissCampaign(id: string) {
  return dismissalSchema.parse(
    await authenticatedRequest(creatorCampaignActionPath(id, 'dismiss'), 'POST')
  );
}
export async function getApplications(
  query: ApplicationQuery,
  campaignId?: string,
  signal?: AbortSignal
) {
  return applicationPageSchema.parse(
    await authenticatedRequest(
      queryPath(
        campaignId ? brandApplicationsPath(campaignId) : APPLICATION_PATH.own,
        query
      ),
      'GET',
      undefined,
      signal
    )
  );
}
export async function decideApplication(
  id: string,
  decision: 'accept' | 'reject'
) {
  return applicationSchema.parse(
    await authenticatedRequest(applicationDecisionPath(id, decision), 'POST')
  );
}
