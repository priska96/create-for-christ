import { deleteCampaignImage } from "./uploads.js";
import type pg from "pg";
import {
  campaignDetailSchema,
  type CampaignDetail,
  type CampaignInput,
} from "@create-for-christ/contracts";

export class CampaignForbidden extends Error {}
export class CampaignNotFound extends Error {}
export class CampaignStateError extends Error {}

export interface CampaignStore {
  listOwn(userId: string): Promise<CampaignDetail[]>;
  create(userId: string, input: CampaignInput): Promise<CampaignDetail>;
  update(
    userId: string,
    campaignId: string,
    input: CampaignInput,
  ): Promise<CampaignDetail>;
  publish(userId: string, campaignId: string): Promise<CampaignDetail>;
  close(userId: string, campaignId: string): Promise<CampaignDetail>;
  setProductImage(
    userId: string,
    campaignId: string,
    saveImage: () => Promise<string>,
  ): Promise<CampaignDetail>;
}

const selectFields = `
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
function mapRow(row: Record<string, unknown>): CampaignDetail {
  return campaignDetailSchema.parse({
    ...row,
    contentDeadline: toIso(row.contentDeadline),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  });
}

async function resolveBrandId(
  client: pg.PoolClient | pg.Pool,
  userId: string,
): Promise<string> {
  const {
    rows: [row],
  } = await client.query(
    `
    SELECT bm.brand_id AS "brandId" FROM auth_identities a
    JOIN profiles p ON p.id = a.profile_id
    JOIN brand_members bm ON bm.profile_id = p.id AND bm.role = 'owner'
    WHERE a.provider = 'better-auth' AND a.subject = $1`,
    [userId],
  );
  if (!row) throw new CampaignForbidden("Kein Brand-Profil gefunden.");
  return row.brandId as string;
}

export function createCampaignStore(pool: pg.Pool): CampaignStore {
  return {
    async listOwn(userId) {
      const brandId = await resolveBrandId(pool, userId);
      const { rows } = await pool.query(
        `SELECT ${selectFields} FROM campaigns c WHERE c.brand_id = $1 ORDER BY c.created_at DESC, c.id DESC`,
        [brandId],
      );
      return rows.map(mapRow);
    },
    async create(userId, input) {
      const brandId = await resolveBrandId(pool, userId);
      const {
        rows: [row],
      } = await pool.query(
        `
        INSERT INTO campaigns AS c (
          brand_id, title, product_name, description, deal_type, amount_per_reel_minor, product_value_minor, currency,
          reel_count, reel_length_seconds, creator_slots, content_deadline, shipping_required, shipping_notes,
          required_mentions, min_posting_duration_days, usage_duration_days, usage_channels, usage_paid_ads_allowed
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
        RETURNING ${selectFields}`,
        [
          brandId,
          input.title,
          input.productName,
          input.description,
          input.compensation.type,
          input.compensation.type === "paid"
            ? input.compensation.amountPerReelMinor
            : null,
          input.compensation.type === "barter"
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
        ],
      );
      return mapRow(row);
    },
    async update(userId, campaignId, input) {
      const brandId = await resolveBrandId(pool, userId);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const {
          rows: [existing],
        } = await client.query(
          "SELECT status FROM campaigns WHERE id=$1 AND brand_id=$2 FOR UPDATE",
          [campaignId, brandId],
        );
        if (!existing) throw new CampaignNotFound("Kampagne nicht gefunden.");
        if (!["draft", "published"].includes(existing.status))
          throw new CampaignStateError(
            "Eine geschlossene Kampagne kann nicht bearbeitet werden.",
          );
        const {
          rows: [row],
        } = await client.query(
          `
          UPDATE campaigns AS c SET
            title=$1, product_name=$2, description=$3, deal_type=$4, amount_per_reel_minor=$5, product_value_minor=$6,
            currency=$7, reel_count=$8, reel_length_seconds=$9, creator_slots=$10, content_deadline=$11,
            shipping_required=$12, shipping_notes=$13, required_mentions=$14, min_posting_duration_days=$15,
            usage_duration_days=$16, usage_channels=$17, usage_paid_ads_allowed=$18, updated_at=now()
          WHERE c.id=$19 RETURNING ${selectFields}`,
          [
            input.title,
            input.productName,
            input.description,
            input.compensation.type,
            input.compensation.type === "paid"
              ? input.compensation.amountPerReelMinor
              : null,
            input.compensation.type === "barter"
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
            campaignId,
          ],
        );
        await client.query("COMMIT");
        return mapRow(row);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
    async publish(userId, campaignId) {
      return transition(pool, userId, campaignId, "draft", "published");
    },
    async close(userId, campaignId) {
      return transition(pool, userId, campaignId, "published", "closed");
    },
    async setProductImage(userId, campaignId, saveImage) {
      const brandId = await resolveBrandId(pool, userId);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const {
          rows: [existing],
        } = await client.query(
          "SELECT status, product_image_url FROM campaigns WHERE id=$1 AND brand_id=$2 FOR UPDATE",
          [campaignId, brandId],
        );
        if (!existing) throw new CampaignNotFound("Kampagne nicht gefunden.");
        if (!["draft", "published"].includes(existing.status))
          throw new CampaignStateError(
            "Eine geschlossene Kampagne kann nicht bearbeitet werden.",
          );
        const {
          rows: [row],
        } = await client.query(
          `UPDATE campaigns AS c SET product_image_url=$1, updated_at=now() WHERE c.id=$2 RETURNING ${selectFields}`,
          [await saveImage(), campaignId],
        );
        const result = mapRow(row);
        await client.query("COMMIT");
        // A cleanup failure must not turn a committed upload into a failed response.
        if (existing.product_image_url) {
          try { await deleteCampaignImage(existing.product_image_url); }
          catch { console.error("Old campaign image cleanup failed."); }
        }
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

async function transition(
  pool: pg.Pool,
  userId: string,
  campaignId: string,
  from: string,
  to: string,
): Promise<CampaignDetail> {
  const brandId = await resolveBrandId(pool, userId);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const {
      rows: [existing],
    } = await client.query(
      "SELECT status FROM campaigns WHERE id=$1 AND brand_id=$2 FOR UPDATE",
      [campaignId, brandId],
    );
    if (!existing) throw new CampaignNotFound("Kampagne nicht gefunden.");
    if (existing.status !== from)
      throw new CampaignStateError(
        to === "published"
          ? "Nur Entwürfe können veröffentlicht werden."
          : "Nur veröffentlichte Kampagnen können geschlossen werden.",
      );
    const {
      rows: [row],
    } = await client.query(
      `UPDATE campaigns AS c SET status=$1, updated_at=now() WHERE c.id=$2 RETURNING ${selectFields}`,
      [to, campaignId],
    );
    await client.query("COMMIT");
    return mapRow(row);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
