import { z } from 'zod';
import { APPLICATION, APPLICATION_STATUS } from './applicationConstants.js';
import { campaignDetailSchema, dealTypeSchema } from './schemas.js';
export const campaignSnapshotSchema = campaignDetailSchema.extend({
  brandName: z.string(),
  version: z.number().int().positive(),
  applicationDeadline: z.iso.datetime({ offset: true }).nullable(),
});
export const feedCampaignSchema = campaignSnapshotSchema.extend({
  remainingSlots: z.number().int().nonnegative(),
});
export const pageQuerySchema = z
  .object({
    cursor: z.string().min(1).max(APPLICATION.cursorLength).optional(),
  })
  .strict();
export const feedQuerySchema = pageQuerySchema.extend({
  dealType: dealTypeSchema.optional(),
});
export const applicationQuerySchema = pageQuerySchema.extend({
  status: z.enum(APPLICATION_STATUS).optional(),
});
export const applicationInputSchema = z
  .object({
    pitch: z.string().trim().max(APPLICATION.pitchLength),
    campaignVersion: z.number().int().positive(),
  })
  .strict();
export const publicCreatorSchema = z.object({
  id: z.uuid(),
  displayName: z.string(),
  bio: z.string(),
  instagramHandle: z.string(),
  location: z.string(),
  languages: z.array(z.string()),
  topics: z.array(z.string()),
  portfolioUrls: z.array(z.string()),
});
export const applicationSchema = z.object({
  id: z.uuid(),
  status: z.enum(APPLICATION_STATUS),
  pitch: z.string(),
  createdAt: z.string(),
  decidedAt: z.string().nullable(),
  campaign: campaignSnapshotSchema,
  creator: publicCreatorSchema,
  collaborationId: z.uuid().nullable(),
});
export const applicationPageSchema = z.object({
  applications: z.array(applicationSchema),
  nextCursor: z.string().nullable(),
});
export const feedPageSchema = z.object({
  campaigns: z.array(feedCampaignSchema),
  nextCursor: z.string().nullable(),
});
export const dismissalSchema = z.object({ dismissed: z.literal(true) });
export type CampaignSnapshot = z.infer<typeof campaignSnapshotSchema>;
export type FeedCampaign = z.infer<typeof feedCampaignSchema>;
export type FeedQuery = z.infer<typeof feedQuerySchema>;
export type ApplicationQuery = z.infer<typeof applicationQuerySchema>;
export type ApplicationInput = z.infer<typeof applicationInputSchema>;
export type ApplicationRecord = z.infer<typeof applicationSchema>;
export type ApplicationPage = z.infer<typeof applicationPageSchema>;
export type FeedPage = z.infer<typeof feedPageSchema>;
