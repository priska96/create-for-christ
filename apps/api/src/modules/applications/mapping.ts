import {
  applicationSchema,
  campaignDetailSchema,
  campaignSnapshotSchema,
  type ApplicationRecord,
  type CampaignSnapshot,
} from '@create-for-christ/contracts';
import { mapRow, selectFields } from '../campaigns/mapping.js';
export const snapshotFields = `${selectFields}, c.revision AS version, b.name AS "brandName", c.application_deadline AS "applicationDeadline"`;
export function snapshot(row: Record<string, unknown>): CampaignSnapshot {
  return campaignSnapshotSchema.parse({
    ...mapRow(
      Object.fromEntries(
        Object.keys(campaignDetailSchema.shape).map((key) => [key, row[key]])
      )
    ),
    brandName: row.brandName,
    version: row.version,
    applicationDeadline:
      row.applicationDeadline instanceof Date
        ? row.applicationDeadline.toISOString()
        : (row.applicationDeadline ?? null),
  });
}
export const applicationFields = `a.id, a.status, a.pitch, a.created_at AS "createdAt", a.decided_at AS "decidedAt", a.campaign_snapshot AS campaign, co.id AS "collaborationId",
 json_build_object('id',p.id,'displayName',p.display_name,'bio',cp.bio,'instagramHandle',cp.instagram_handle,'location',cp.location,'languages',cp.languages,'topics',cp.topics,'portfolioUrls',cp.portfolio_urls) AS creator`;
export const applicationJoins = `JOIN creator_profiles cp ON cp.profile_id=a.creator_id JOIN profiles p ON p.id=cp.profile_id LEFT JOIN collaborations co ON co.application_id=a.id`;
export function mapApplication(
  row: Record<string, unknown>
): ApplicationRecord {
  return applicationSchema.parse({
    ...row,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : row.createdAt,
    decidedAt:
      row.decidedAt instanceof Date
        ? row.decidedAt.toISOString()
        : (row.decidedAt ?? null),
  });
}
