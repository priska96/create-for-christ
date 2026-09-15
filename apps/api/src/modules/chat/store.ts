import {
  AUTH,
  CHAT,
  CHAT_ERROR,
  HTTP,
  type MessageInput,
} from '@create-for-christ/contracts';
import type pg from 'pg';
import { RequestError } from '../../http/errors.js';
import { transaction } from '../../infrastructure/transaction.js';
import { cursorColumn, readCursor } from '../applications/pagination.js';
type Db = pg.Pool | pg.PoolClient;
const joins = `FROM collaborations co JOIN applications a ON a.id=co.application_id JOIN campaigns c ON c.id=a.campaign_id JOIN brands b ON b.id=c.brand_id JOIN profiles creator ON creator.id=a.creator_id JOIN brand_members bm ON bm.brand_id=b.id AND bm.role='owner' JOIN auth_identities identity ON identity.profile_id IN (a.creator_id,bm.profile_id) AND identity.provider=$1 AND identity.subject=$2`;
const messageFields = `id, sequence::text, client_id AS "clientId", sender_id AS "senderId", body, to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "createdAt"`;
const fields = `co.id, identity.profile_id AS "selfId", CASE WHEN identity.profile_id=a.creator_id THEN b.name ELSE creator.display_name END AS "partnerName", co.terms_snapshot->>'title' AS "campaignTitle", co.created_at AS "createdAt", co.terms_snapshot AS terms,
 (SELECT count(*)::int FROM messages m WHERE m.collaboration_id=co.id AND m.sender_id<>identity.profile_id AND m.sequence>COALESCE((SELECT through_sequence FROM conversation_reads cr WHERE cr.collaboration_id=co.id AND cr.profile_id=identity.profile_id),0)) AS "unreadCount",
 (SELECT row_to_json(last_message) FROM (SELECT ${messageFields} FROM messages WHERE collaboration_id=co.id ORDER BY messages.sequence DESC LIMIT 1) last_message) AS "lastMessage"`;
export function createChatStore(pool: pg.Pool) {
  async function member(
    db: Db,
    userId: string,
    id: string,
    lock = false
  ): Promise<string> {
    const {
      rows: [row],
    } = await db.query(
      `SELECT identity.profile_id AS id ${joins} WHERE co.id=$3 ${lock ? 'FOR UPDATE OF co' : ''}`,
      [AUTH.provider, userId, id]
    );
    if (!row) throw new RequestError(HTTP.notFound, CHAT_ERROR.notFound);
    return row.id;
  }
  return {
    async list(userId: string, cursor?: string) {
      const key = readCursor(cursor);
      const { rows } = await pool.query(
        `SELECT ${fields}, ${cursorColumn('co')} ${joins} WHERE ($3::timestamptz IS NULL OR (co.created_at,co.id)<($3::timestamptz,$4::uuid)) ORDER BY co.created_at DESC,co.id DESC LIMIT $5`,
        [AUTH.provider, userId, key.time, key.id, CHAT.pageSize + 1]
      );
      // Conversation pagination shares the existing microsecond-safe cursor format.
      const items = rows.slice(0, CHAT.pageSize),
        last = items.at(-1);
      const nextCursor =
        rows.length > CHAT.pageSize && last
          ? Buffer.from(
              JSON.stringify({ time: last.cursorTime, id: last.id })
            ).toString('base64url')
          : null;
      return {
        conversations: items.map((row) => ({
          ...row,
          createdAt: row.createdAt.toISOString(),
        })),
        nextCursor,
      };
    },
    async detail(userId: string, id: string) {
      const {
        rows: [row],
      } = await pool.query(`SELECT ${fields} ${joins} WHERE co.id=$3`, [
        AUTH.provider,
        userId,
        id,
      ]);
      if (!row) throw new RequestError(HTTP.notFound, CHAT_ERROR.notFound);
      return { ...row, createdAt: row.createdAt.toISOString() };
    },
    async messages(userId: string, id: string, before?: string) {
      await member(pool, userId, id);
      const { rows } = await pool.query(
        `SELECT ${messageFields} FROM messages WHERE collaboration_id=$1 AND ($2::bigint IS NULL OR sequence<$2::bigint) ORDER BY messages.sequence DESC LIMIT $3`,
        [id, before ?? null, CHAT.pageSize + 1]
      );
      const messages = rows.slice(0, CHAT.pageSize);
      return {
        messages,
        nextCursor:
          rows.length > CHAT.pageSize ? messages.at(-1).sequence : null,
      };
    },
    async send(userId: string, id: string, input: MessageInput) {
      return transaction(pool, async (db) => {
        // Serialize sends per chat so a committed message cannot appear behind a read watermark.
        const sender = await member(db, userId, id, true);
        const {
          rows: [existing],
        } = await db.query(
          `SELECT ${messageFields} FROM messages WHERE collaboration_id=$1 AND sender_id=$2 AND client_id=$3`,
          [id, sender, input.clientId]
        );
        if (existing) {
          if (existing.body !== input.body)
            throw new RequestError(HTTP.conflict, CHAT_ERROR.conflict);
          return existing;
        }
        const {
          rows: [message],
        } = await db.query(
          `INSERT INTO messages(collaboration_id,sender_id,body,client_id) VALUES($1,$2,$3,$4) RETURNING ${messageFields}`,
          [id, sender, input.body, input.clientId]
        );
        return message;
      });
    },
    async read(userId: string, id: string, through: string) {
      const self = await member(pool, userId, id);
      const { rowCount } = await pool.query(
        `INSERT INTO conversation_reads(collaboration_id,profile_id,through_sequence) SELECT $1,$2,sequence FROM messages WHERE collaboration_id=$1 AND sequence=$3::bigint ON CONFLICT(collaboration_id,profile_id) DO UPDATE SET through_sequence=GREATEST(conversation_reads.through_sequence,EXCLUDED.through_sequence)`,
        [id, self, through]
      );
      if (!rowCount) throw new RequestError(HTTP.notFound, CHAT_ERROR.notFound);
      return { ok: true };
    },
  };
}
export type ChatStore = ReturnType<typeof createChatStore>;
