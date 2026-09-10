import type { Campaign, DealType } from '@create-for-christ/contracts';
import { LIMITS } from '@create-for-christ/contracts';
import pg from 'pg';
import { DATABASE } from '../config/constants.js';

export interface Database {
  ping(): Promise<void>;
  listCampaigns(dealType?: DealType): Promise<Campaign[]>;
  close(): Promise<void>;
}
export function createDatabase(
  connectionString: string,
  sharedPool?: pg.Pool
): Database {
  const pool =
    sharedPool ??
    new pg.Pool({
      connectionString,
      max: DATABASE.poolSize,
      connectionTimeoutMillis: DATABASE.connectionTimeoutMs,
      statement_timeout: DATABASE.statementTimeoutMs,
    });
  pool.on('error', () => console.error('An idle database connection failed.'));
  return {
    async ping() {
      await pool.query('SELECT 1');
    },
    async listCampaigns(dealType) {
      const { rows } = await pool.query(
        `
        SELECT c.id, c.title, b.name AS "brandName", c.product_name AS "productName",
          c.product_image_url AS "productImageUrl", c.description, c.reel_count AS "reelCount", c.currency,
          CASE WHEN c.deal_type = 'barter'
            THEN json_build_object('type', 'barter', 'productValueMinor', c.product_value_minor)
            ELSE json_build_object('type', 'paid', 'amountPerReelMinor', c.amount_per_reel_minor)
          END AS compensation
        FROM campaigns c JOIN brands b ON b.id = c.brand_id
        WHERE c.status = 'published' AND (c.application_deadline IS NULL OR c.application_deadline > now())
          AND ($1::text IS NULL OR c.deal_type = $1)
        ORDER BY c.created_at DESC, c.id DESC LIMIT $2
      `,
        [dealType ?? null, LIMITS.discoveryPage]
      );
      return rows as Campaign[];
    },
    async close() {
      await pool.end();
    },
  };
}
