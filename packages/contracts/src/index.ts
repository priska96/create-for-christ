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
