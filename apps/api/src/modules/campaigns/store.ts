import {
  CAMPAIGN_STATUS,
  APPLICATION_MESSAGE,
  APPLICATION_STATUS,
  type CampaignDetail,
  type CampaignInput,
  type CampaignStatus,
} from '@create-for-christ/contracts';
import type pg from 'pg';
import { transaction } from '../../infrastructure/transaction.js';
import { deleteCampaignImage } from './images.js';
import { inputValues, mapRow, selectFields } from './mapping.js';

export class CampaignForbidden extends Error {}
export class CampaignNotFound extends Error {}
export class CampaignStateError extends Error {}

export interface CampaignStore {
  listOwn(userId: string): Promise<CampaignDetail[]>;
  create(userId: string, input: CampaignInput): Promise<CampaignDetail>;
  update(
    userId: string,
    campaignId: string,
    input: CampaignInput
  ): Promise<CampaignDetail>;
  publish(userId: string, campaignId: string): Promise<CampaignDetail>;
  close(userId: string, campaignId: string): Promise<CampaignDetail>;
  setProductImage(
    userId: string,
    campaignId: string,
    saveImage: () => Promise<string>
  ): Promise<CampaignDetail>;
}

async function resolveBrandId(
  client: pg.PoolClient | pg.Pool,
  userId: string
): Promise<string> {
  const {
    rows: [row],
  } = await client.query(
    `
    SELECT bm.brand_id AS "brandId" FROM auth_identities a
    JOIN profiles p ON p.id = a.profile_id
    JOIN brand_members bm ON bm.profile_id = p.id AND bm.role = 'owner'
    WHERE a.provider = 'better-auth' AND a.subject = $1`,
    [userId]
  );
  if (!row) throw new CampaignForbidden('Kein Brand-Profil gefunden.');
  return row.brandId as string;
}

async function lockCampaign(
  client: pg.PoolClient,
  userId: string,
  campaignId: string
) {
  const brandId = await resolveBrandId(client, userId);
  const {
    rows: [row],
  } = await client.query(
    'SELECT status, product_image_url FROM campaigns WHERE id=$1 AND brand_id=$2 FOR UPDATE',
    [campaignId, brandId]
  );
  if (!row) throw new CampaignNotFound('Kampagne nicht gefunden.');
  return row as { status: CampaignStatus; product_image_url: string | null };
}
function requireEditable(status: CampaignStatus) {
  if (status !== CAMPAIGN_STATUS.draft && status !== CAMPAIGN_STATUS.published)
    throw new CampaignStateError(
      'Eine geschlossene Kampagne kann nicht bearbeitet werden.'
    );
}
export function createCampaignStore(pool: pg.Pool): CampaignStore {
  async function transition(
    userId: string,
    campaignId: string,
    from: CampaignStatus,
    to: CampaignStatus
  ) {
    return transaction(pool, async (client) => {
      const existing = await lockCampaign(client, userId, campaignId);
      if (existing.status !== from)
        throw new CampaignStateError(
          to === CAMPAIGN_STATUS.published
            ? 'Nur Entwürfe können veröffentlicht werden.'
            : 'Nur veröffentlichte Kampagnen können geschlossen werden.'
        );
      const {
        rows: [row],
      } = await client.query(
        `UPDATE campaigns AS c SET status=$1,updated_at=now() WHERE c.id=$2 RETURNING ${selectFields}`,
        [to, campaignId]
      );
      return mapRow(row);
    });
  }
  return {
    async listOwn(userId) {
      const brandId = await resolveBrandId(pool, userId);
      const { rows } = await pool.query(
        `SELECT ${selectFields} FROM campaigns c WHERE c.brand_id=$1 ORDER BY c.created_at DESC,c.id DESC`,
        [brandId]
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
        [brandId, ...inputValues(input)]
      );
      return mapRow(row);
    },
    async update(userId, campaignId, input) {
      return transaction(pool, async (client) => {
        const existing = await lockCampaign(client, userId, campaignId);
        requireEditable(existing.status);
        const {
          rows: [capacity],
        } = await client.query(
          'SELECT count(*)::int AS occupied FROM applications WHERE campaign_id=$1 AND status=$2',
          [campaignId, APPLICATION_STATUS.accepted]
        );
        if (input.creatorSlots < capacity.occupied)
          throw new CampaignStateError(APPLICATION_MESSAGE.capacity);
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
          [...inputValues(input), campaignId]
        );
        return mapRow(row);
      });
    },
    publish: (userId, id) =>
      transition(userId, id, CAMPAIGN_STATUS.draft, CAMPAIGN_STATUS.published),
    close: (userId, id) =>
      transition(userId, id, CAMPAIGN_STATUS.published, CAMPAIGN_STATUS.closed),
    async setProductImage(userId, campaignId, saveImage) {
      const { result, previousImage } = await transaction(
        pool,
        async (client) => {
          const existing = await lockCampaign(client, userId, campaignId);
          requireEditable(existing.status);
          const {
            rows: [row],
          } = await client.query(
            `UPDATE campaigns AS c SET product_image_url=$1,updated_at=now() WHERE c.id=$2 RETURNING ${selectFields}`,
            [await saveImage(), campaignId]
          );
          // Keep images referenced by immutable application terms.
          const { rowCount: references } = await client.query(
            "SELECT 1 FROM applications WHERE campaign_id=$1 AND campaign_snapshot->>'productImageUrl'=$2 LIMIT 1",
            [campaignId, existing.product_image_url]
          );
          return {
            result: mapRow(row),
            previousImage: references ? null : existing.product_image_url,
          };
        }
      );
      // Cleanup happens after commit and cannot invalidate a successful upload.
      if (previousImage) {
        try {
          await deleteCampaignImage(previousImage);
        } catch {
          console.error('Old campaign image cleanup failed.');
        }
      }
      return result;
    },
  };
}
