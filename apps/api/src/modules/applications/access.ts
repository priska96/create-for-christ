import {
  APPLICATION_MESSAGE,
  AUTH,
  HTTP,
  ROLE,
} from '@create-for-christ/contracts';
import type pg from 'pg';
import { RequestError } from '../../http/errors.js';
type Queryable = pg.Pool | pg.PoolClient;
export async function creatorId(
  db: Queryable,
  userId: string
): Promise<string> {
  const {
    rows: [row],
  } = await db.query(
    `SELECT p.id FROM auth_identities a JOIN profiles p ON p.id=a.profile_id JOIN creator_profiles cp ON cp.profile_id=p.id WHERE a.provider=$1 AND a.subject=$2 AND p.role=$3`,
    [AUTH.provider, userId, ROLE.creator]
  );
  if (!row)
    throw new RequestError(HTTP.forbidden, APPLICATION_MESSAGE.creatorOnly);
  return row.id;
}
export async function ownCampaign(db: Queryable, userId: string, id: string) {
  const { rowCount } = await db.query(
    `SELECT c.id FROM campaigns c JOIN brand_members bm ON bm.brand_id=c.brand_id AND bm.role='owner' JOIN auth_identities a ON a.profile_id=bm.profile_id WHERE c.id=$1 AND a.subject=$2 AND a.provider=$3`,
    [id, userId, AUTH.provider]
  );
  if (!rowCount)
    throw new RequestError(HTTP.notFound, APPLICATION_MESSAGE.campaignNotFound);
}
export const acceptedCountSql = `(SELECT count(*)::int FROM applications occupied WHERE occupied.campaign_id=c.id AND occupied.status='accepted')`;
export const availableSql = `c.status='published' AND (c.application_deadline IS NULL OR c.application_deadline>now()) AND (c.content_deadline IS NULL OR c.content_deadline>now())`;
