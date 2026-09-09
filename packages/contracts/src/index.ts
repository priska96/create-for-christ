import { z } from 'zod';

export const dealTypeSchema = z.enum(['barter', 'paid']);
export const campaignSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  brandName: z.string(),
  productName: z.string(),
  description: z.string(),
  reelCount: z.number().int().positive(),
  currency: z.string().length(3),
  compensation: z.discriminatedUnion('type', [
    z.object({ type: z.literal('barter'), productValueMinor: z.number().int().nonnegative() }),
    z.object({ type: z.literal('paid'), amountPerReelMinor: z.number().int().positive() }),
  ]),
});
export const campaignListSchema = z.object({ campaigns: z.array(campaignSchema) });
export const healthSchema = z.object({ status: z.literal('ok'), service: z.literal('create-for-christ-api') });
export type Campaign = z.infer<typeof campaignSchema>;
export type DealType = z.infer<typeof dealTypeSchema>;


const shortText = z.string().trim().min(1, 'Bitte ausfüllen.').max(100);
const optionalText = z.string().trim().max(200);
const instagramReel = z.url().max(500).refine(value => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && ['instagram.com', 'www.instagram.com'].includes(url.hostname)
      && /^\/reels?\/[A-Za-z0-9_-]+\/?$/.test(url.pathname) && !url.username && !url.password;
  } catch { return false; }
}, 'Bitte einen Instagram-Reel-Link mit https:// angeben.');
export const creatorProfileInput = z.object({
  role: z.literal('creator'),
  displayName: shortText,
  bio: z.string().trim().max(1000),
  instagramHandle: z.string().trim().regex(/^[A-Za-z0-9._]{1,30}$/, 'Instagram-Nutzername ohne @ oder URL.'),
  location: optionalText,
  languages: z.array(shortText).min(1, 'Mindestens eine Sprache angeben.').max(10),
  topics: z.array(shortText).max(10),
  dealPreferences: z.array(dealTypeSchema).min(1, 'Mindestens eine Deal-Art wählen.').max(2)
    .refine(values => new Set(values).size === values.length),
  portfolioUrls: z.array(instagramReel).max(5),
}).strict();
export const brandProfileInput = z.object({
  role: z.literal('brand'),
  displayName: shortText,
  brandName: shortText,
  description: z.string().trim().max(1500),
  website: z.union([z.literal(''), z.url().max(300).refine(value => {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
  }, 'Bitte eine gültige Website angeben.')]),
  industry: shortText,
  location: optionalText,
}).strict();
export const profileInputSchema = z.discriminatedUnion('role', [creatorProfileInput, brandProfileInput]);
export const ownProfileSchema = z.object({ id: z.uuid(), details: profileInputSchema });
export const meSchema = z.object({
  user: z.object({ id: z.string(), email: z.email(), name: z.string(), emailVerified: z.boolean() }),
  profile: ownProfileSchema.nullable(),
});
export type ProfileInput = z.infer<typeof profileInputSchema>;
export type OwnProfile = z.infer<typeof ownProfileSchema>;
export type Me = z.infer<typeof meSchema>;
