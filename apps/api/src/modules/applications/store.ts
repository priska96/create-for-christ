import {
  APPLICATION,
  APPLICATION_MESSAGE,
  APPLICATION_STATUS,
  AUTH,
  HTTP,
  type ApplicationInput,
  type ApplicationQuery,
  type FeedQuery,
} from '@create-for-christ/contracts';
import type pg from 'pg';
import { RequestError } from '../../http/errors.js';
import { transaction } from '../../infrastructure/transaction.js';
import {
  acceptedCountSql,
  availableSql,
  creatorId,
  ownCampaign,
} from './access.js';
import {
  applicationFields,
  applicationJoins,
  mapApplication,
  snapshot,
  snapshotFields,
} from './mapping.js';
import { cursorColumn, pageRows, readCursor } from './pagination.js';
async function applicationById(db: pg.Pool | pg.PoolClient, id: string) {
  const {
    rows: [row],
  } = await db.query(
    `SELECT ${applicationFields} FROM applications a ${applicationJoins} WHERE a.id=$1`,
    [id]
  );
  if (!row) throw new RequestError(HTTP.notFound, APPLICATION_MESSAGE.notFound);
  return mapApplication(row);
}
async function lockCampaign(db: pg.PoolClient, id: string) {
  const {
    rows: [row],
  } = await db.query(
    `SELECT ${snapshotFields}, ${availableSql} AS available FROM campaigns c JOIN brands b ON b.id=c.brand_id WHERE c.id=$1 FOR UPDATE OF c`,
    [id]
  );
  if (!row)
    throw new RequestError(HTTP.notFound, APPLICATION_MESSAGE.campaignNotFound);
  return row;
}
async function requireVacancy(db: pg.PoolClient, id: string, slots: number) {
  const {
    rows: [row],
  } = await db.query(
    `SELECT count(*)::int AS count FROM applications WHERE campaign_id=$1 AND status=$2`,
    [id, APPLICATION_STATUS.accepted]
  );
  if (row.count >= slots)
    throw new RequestError(HTTP.conflict, APPLICATION_MESSAGE.full);
}
export function createApplicationStore(pool: pg.Pool) {
  return {
    async feed(userId: string, query: FeedQuery) {
      const creator = await creatorId(pool, userId),
        cursor = readCursor(query.cursor);
      const { rows } = await pool.query(
        `SELECT ${snapshotFields}, c.creator_slots-${acceptedCountSql} AS "remainingSlots", ${cursorColumn('c')}
        FROM campaigns c JOIN brands b ON b.id=c.brand_id
        WHERE ${availableSql} AND c.creator_slots>${acceptedCountSql}
          AND c.deal_type=ANY(SELECT unnest(deal_preferences) FROM creator_profiles WHERE profile_id=$1)
          AND ($2::text IS NULL OR c.deal_type=$2)
          AND NOT EXISTS (SELECT 1 FROM applications a WHERE a.creator_id=$1 AND a.campaign_id=c.id)
          AND NOT EXISTS (SELECT 1 FROM campaign_dismissals d WHERE d.creator_id=$1 AND d.campaign_id=c.id)
          AND ($3::timestamptz IS NULL OR (c.created_at,c.id)<($3::timestamptz,$4::uuid))
        ORDER BY c.created_at DESC,c.id DESC LIMIT $5`,
        [
          creator,
          query.dealType ?? null,
          cursor.time,
          cursor.id,
          APPLICATION.pageSize + 1,
        ]
      );
      const page = pageRows(rows);
      return {
        campaigns: page.items.map((row) => ({
          ...snapshot(row),
          remainingSlots: row.remainingSlots,
        })),
        nextCursor: page.nextCursor,
      };
    },
    async apply(userId: string, id: string, input: ApplicationInput) {
      const creator = await creatorId(pool, userId);
      return transaction(pool, async (db) => {
        const campaign = await lockCampaign(db, id);
        const {
          rows: [existing],
        } = await db.query(
          'SELECT id FROM applications WHERE campaign_id=$1 AND creator_id=$2',
          [id, creator]
        );
        // Retry after a lost response returns the same application, including after a decision.
        if (existing) return applicationById(db, existing.id);
        if (!campaign.available)
          throw new RequestError(
            HTTP.conflict,
            APPLICATION_MESSAGE.unavailable
          );
        if (campaign.version !== input.campaignVersion)
          throw new RequestError(HTTP.conflict, APPLICATION_MESSAGE.changed);
        await requireVacancy(db, id, campaign.creatorSlots);
        const { rowCount } = await db.query(
          'SELECT 1 FROM campaign_dismissals WHERE creator_id=$1 AND campaign_id=$2',
          [creator, id]
        );
        if (rowCount)
          throw new RequestError(HTTP.conflict, APPLICATION_MESSAGE.dismissed);
        const {
          rows: [row],
        } = await db.query(
          'INSERT INTO applications(campaign_id,creator_id,pitch,campaign_snapshot) VALUES ($1,$2,$3,$4) RETURNING id',
          [id, creator, input.pitch, JSON.stringify(snapshot(campaign))]
        );
        return applicationById(db, row.id);
      });
    },
    async dismiss(userId: string, id: string) {
      const creator = await creatorId(pool, userId);
      return transaction(pool, async (db) => {
        const campaign = await lockCampaign(db, id);
        if (!campaign.available)
          throw new RequestError(
            HTTP.conflict,
            APPLICATION_MESSAGE.unavailable
          );
        const { rowCount } = await db.query(
          'SELECT 1 FROM applications WHERE creator_id=$1 AND campaign_id=$2',
          [creator, id]
        );
        if (rowCount)
          throw new RequestError(HTTP.conflict, APPLICATION_MESSAGE.applied);
        await db.query(
          'INSERT INTO campaign_dismissals(creator_id,campaign_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
          [creator, id]
        );
        return { dismissed: true as const };
      });
    },
    async listBrandInbox(userId: string, query: ApplicationQuery) {
      return list('brandOwner', userId, query);
    },
    async listOwn(userId: string, query: ApplicationQuery) {
      const creator = await creatorId(pool, userId);
      return list('a.creator_id', creator, query);
    },
    async listBrand(userId: string, id: string, query: ApplicationQuery) {
      await ownCampaign(pool, userId, id);
      return list('a.campaign_id', id, query);
    },
    async decide(
      userId: string,
      id: string,
      decision: 'accepted' | 'rejected'
    ) {
      return transaction(pool, async (db) => {
        // All capacity-affecting operations lock the campaign first, then the application.
        const {
          rows: [owner],
        } = await db.query(
          `SELECT c.id FROM campaigns c JOIN applications a ON a.campaign_id=c.id JOIN brand_members bm ON bm.brand_id=c.brand_id AND bm.role='owner' JOIN auth_identities identity ON identity.profile_id=bm.profile_id WHERE a.id=$1 AND identity.subject=$2 AND identity.provider=$3 FOR UPDATE OF c`,
          [id, userId, AUTH.provider]
        );
        if (!owner)
          throw new RequestError(HTTP.notFound, APPLICATION_MESSAGE.notFound);
        const {
          rows: [application],
        } = await db.query(
          'SELECT status,campaign_snapshot FROM applications WHERE id=$1 FOR UPDATE',
          [id]
        );
        if (application.status === decision) return applicationById(db, id);
        if (application.status !== APPLICATION_STATUS.pending)
          throw new RequestError(HTTP.conflict, APPLICATION_MESSAGE.decided);
        if (decision === APPLICATION_STATUS.accepted) {
          const campaign = await lockCampaign(db, owner.id);
          if (!campaign.available)
            throw new RequestError(
              HTTP.conflict,
              APPLICATION_MESSAGE.unavailable
            );
          await requireVacancy(db, owner.id, campaign.creatorSlots);
          await db.query(
            'INSERT INTO collaborations(application_id,terms_snapshot) VALUES ($1,$2)',
            [id, application.campaign_snapshot]
          );
        }
        await db.query(
          'UPDATE applications SET status=$1,decided_at=now() WHERE id=$2',
          [decision, id]
        );
        return applicationById(db, id);
      });
    },
  };
  async function list(
    column: 'a.creator_id' | 'a.campaign_id' | 'brandOwner',
    id: string,
    query: ApplicationQuery
  ) {
    const cursor = readCursor(query.cursor);
    const ownerFilter = `EXISTS (SELECT 1 FROM campaigns c JOIN brand_members bm ON bm.brand_id=c.brand_id AND bm.role='owner' JOIN auth_identities identity ON identity.profile_id=bm.profile_id WHERE c.id=a.campaign_id AND identity.subject=$1 AND identity.provider='${AUTH.provider}')`;
    const filter = column === 'brandOwner' ? ownerFilter : `${column}=$1`;
    const { rows } = await pool.query(
      `SELECT ${applicationFields}, ${cursorColumn('a')} FROM applications a ${applicationJoins}
      WHERE ${filter} AND ($2::text IS NULL OR a.status=$2) AND ($3::timestamptz IS NULL OR (a.created_at,a.id)<($3::timestamptz,$4::uuid)) ORDER BY a.created_at DESC,a.id DESC LIMIT $5`,
      [
        id,
        query.status ?? null,
        cursor.time,
        cursor.id,
        APPLICATION.pageSize + 1,
      ]
    );
    const page = pageRows(rows);
    return {
      applications: page.items.map(mapApplication),
      nextCursor: page.nextCursor,
    };
  }
}
export type ApplicationStore = ReturnType<typeof createApplicationStore>;
