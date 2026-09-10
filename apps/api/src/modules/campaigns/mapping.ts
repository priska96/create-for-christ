import {
  campaignDetailSchema,
  DEAL,
  type CampaignDetail,
  type CampaignInput,
} from "@create-for-christ/contracts";
export const selectFields = `
  c.id, c.status, c.title, c.product_name AS "productName", c.description,
  c.product_image_url AS "productImageUrl", c.currency,
  c.reel_count AS "reelCount", c.reel_length_seconds AS "reelLengthSeconds",
  c.creator_slots AS "creatorSlots", c.content_deadline AS "contentDeadline",
  c.shipping_required AS "shippingRequired", c.shipping_notes AS "shippingNotes",
  c.required_mentions AS "requiredMentions", c.min_posting_duration_days AS "minPostingDurationDays",
  c.usage_duration_days AS "usageDurationDays", c.usage_channels AS "usageChannels",
  c.usage_paid_ads_allowed AS "usagePaidAdsAllowed",
  c.created_at AS "createdAt", c.updated_at AS "updatedAt",
  CASE WHEN c.deal_type = 'barter'
    THEN json_build_object('type', 'barter', 'productValueMinor', c.product_value_minor)
    ELSE json_build_object('type', 'paid', 'amountPerReelMinor', c.amount_per_reel_minor)
  END AS compensation
`;

function toIso(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}
export function mapRow(row: Record<string, unknown>): CampaignDetail {
  return campaignDetailSchema.parse({
    ...row,
    contentDeadline: toIso(row.contentDeadline),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  });
}

export function inputValues(input: CampaignInput) {
  return [
    input.title,
    input.productName,
    input.description,
    input.compensation.type,
    input.compensation.type === DEAL.paid
      ? input.compensation.amountPerReelMinor
      : null,
    input.compensation.type === DEAL.barter
      ? input.compensation.productValueMinor
      : null,
    input.currency,
    input.reelCount,
    input.reelLengthSeconds,
    input.creatorSlots,
    input.contentDeadline,
    input.shippingRequired,
    input.shippingNotes,
    input.requiredMentions,
    input.minPostingDurationDays,
    input.usageDurationDays,
    input.usageChannels,
    input.usagePaidAdsAllowed,
  ];
}
