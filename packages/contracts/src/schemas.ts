import { z } from 'zod';
import {
  APP,
  CAMPAIGN_STATUS,
  DEAL,
  IMAGE,
  LIMITS,
  ROLE,
} from './constants.js';

export const dealTypeSchema = z.enum(DEAL);
export const campaignSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  brandName: z.string(),
  productImageUrl: z.string().nullable().optional(),
  productName: z.string(),
  description: z.string(),
  reelCount: z.number().int().positive(),
  currency: z.string().length(3),
  compensation: z.discriminatedUnion('type', [
    z.object({
      type: z.literal(DEAL.barter),
      productValueMinor: z.number().int().nonnegative().max(LIMITS.moneyMinor),
    }),
    z.object({
      type: z.literal(DEAL.paid),
      amountPerReelMinor: z.number().int().positive().max(LIMITS.moneyMinor),
    }),
  ]),
});
export const campaignListSchema = z.object({
  campaigns: z.array(campaignSchema),
});
export const healthSchema = z.object({
  status: z.literal('ok'),
  service: z.literal(APP.service),
});
export type Campaign = z.infer<typeof campaignSchema>;
export type DealType = z.infer<typeof dealTypeSchema>;

const shortText = z
  .string()
  .trim()
  .min(1, 'Bitte ausfüllen.')
  .max(LIMITS.shortText);
const optionalText = z.string().trim().max(LIMITS.optionalText);
const instagramReel = z
  .url()
  .max(LIMITS.reelUrl)
  .refine((value) => {
    try {
      const url = new URL(value);
      return (
        url.protocol === 'https:' &&
        ['instagram.com', 'www.instagram.com'].includes(url.hostname) &&
        /^\/reels?\/[A-Za-z0-9_-]+\/?$/.test(url.pathname) &&
        !url.username &&
        !url.password
      );
    } catch {
      return false;
    }
  }, 'Bitte einen Instagram-Reel-Link mit https:// angeben.');
export const creatorProfileInput = z
  .object({
    role: z.literal(ROLE.creator),
    displayName: shortText,
    bio: z.string().trim().max(LIMITS.creatorBio),
    instagramHandle: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9._]{1,30}$/, 'Instagram-Nutzername ohne @ oder URL.'),
    location: optionalText,
    languages: z
      .array(shortText)
      .min(1, 'Mindestens eine Sprache angeben.')
      .max(LIMITS.languages),
    topics: z.array(shortText).max(LIMITS.topics),
    dealPreferences: z
      .array(dealTypeSchema)
      .min(1, 'Mindestens eine Deal-Art wählen.')
      .max(Object.values(DEAL).length)
      .refine((values) => new Set(values).size === values.length),
    portfolioUrls: z.array(instagramReel).max(LIMITS.portfolioLinks),
  })
  .strict();
export const brandProfileInput = z
  .object({
    role: z.literal(ROLE.brand),
    displayName: shortText,
    brandName: shortText,
    description: z.string().trim().max(LIMITS.brandDescription),
    website: z.union([
      z.literal(''),
      z
        .url()
        .max(LIMITS.website)
        .refine((value) => {
          const url = new URL(value);
          return (
            ['http:', 'https:'].includes(url.protocol) &&
            !url.username &&
            !url.password
          );
        }, 'Bitte eine gültige Website angeben.'),
    ]),
    industry: shortText,
    location: optionalText,
  })
  .strict();
export const profileInputSchema = z.discriminatedUnion('role', [
  creatorProfileInput,
  brandProfileInput,
]);
export const ownProfileSchema = z.object({
  id: z.uuid(),
  details: profileInputSchema,
});
export const meSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.email(),
    name: z.string(),
    emailVerified: z.boolean(),
  }),
  profile: ownProfileSchema.nullable(),
});
export type ProfileInput = z.infer<typeof profileInputSchema>;
export type OwnProfile = z.infer<typeof ownProfileSchema>;
export type Me = z.infer<typeof meSchema>;

const isoDateTime = z.iso.datetime({ offset: true });
const mentionHandle = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9._-]{1,30}$/, 'Instagram-Nutzername ohne @ angeben.');
export const compensationInputSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal(DEAL.barter),
    productValueMinor: z.number().int().nonnegative().max(LIMITS.moneyMinor),
  }),
  z.object({
    type: z.literal(DEAL.paid),
    amountPerReelMinor: z.number().int().positive().max(LIMITS.moneyMinor),
  }),
]);
export const campaignStatusSchema = z.enum(CAMPAIGN_STATUS);
export const campaignInputSchema = z
  .object({
    title: shortText,
    productName: shortText,
    description: z
      .string()
      .trim()
      .min(1, 'Bitte ein Reel-Briefing angeben.')
      .max(LIMITS.campaignDescription),
    compensation: compensationInputSchema,
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, 'Bitte eine 3-stellige Währung angeben.'),
    reelCount: z.number().int().positive().max(LIMITS.reels),
    reelLengthSeconds: z
      .number()
      .int()
      .positive()
      .max(LIMITS.reelSeconds)
      .nullable(),
    creatorSlots: z.number().int().positive().max(LIMITS.creatorSlots),
    contentDeadline: isoDateTime.nullable(),
    shippingRequired: z.boolean(),
    shippingNotes: z.string().trim().max(LIMITS.shippingNotes),
    requiredMentions: z.array(mentionHandle).max(LIMITS.mentions),
    minPostingDurationDays: z
      .number()
      .int()
      .positive()
      .max(LIMITS.durationDays)
      .nullable(),
    usageDurationDays: z
      .number()
      .int()
      .positive()
      .max(LIMITS.durationDays)
      .nullable(),
    usageChannels: z.array(shortText).max(LIMITS.usageChannels),
    usagePaidAdsAllowed: z.boolean(),
  })
  .strict();
export const campaignDetailSchema = campaignInputSchema.extend({
  id: z.uuid(),
  status: campaignStatusSchema,
  productImageUrl: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export const campaignDetailListSchema = z.object({
  campaigns: z.array(campaignDetailSchema),
});
export type CompensationInput = z.infer<typeof compensationInputSchema>;
export type CampaignInput = z.infer<typeof campaignInputSchema>;
export type CampaignDetail = z.infer<typeof campaignDetailSchema>;
export type CampaignStatus = z.infer<typeof campaignStatusSchema>;

// Base64-encoded image data sent as JSON. Bounded well above the 5 MB decoded limit enforced server-side.
export const campaignImageInputSchema = z
  .object({
    mimeType: z.enum(IMAGE.mimeTypes),
    data: z
      .string()
      .min(1)
      .max(IMAGE.maxBase64Length)
      .regex(
        /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/
      ),
  })
  .strict();
export type CampaignImageInput = z.infer<typeof campaignImageInputSchema>;
