import {
  APPLICATION,
  APPLICATION_MESSAGE,
  HTTP,
} from '@create-for-christ/contracts';
import { z } from 'zod';
import { RequestError } from '../../http/errors.js';
const cursorSchema = z
  .object({ time: z.iso.datetime({ offset: true }), id: z.uuid() })
  .strict();
export function readCursor(value?: string) {
  if (!value) return { time: null, id: null };
  try {
    return cursorSchema.parse(
      JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
    );
  } catch {
    throw new RequestError(HTTP.badRequest, APPLICATION_MESSAGE.invalidCursor);
  }
}
// Preserve PostgreSQL microseconds; converting this value through JS Date would skip rows.
export function cursorColumn(alias: string) {
  return `to_char(${alias}.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "cursorTime"`;
}
export function pageRows<T extends { id: string; cursorTime: string }>(
  rows: T[]
) {
  const items = rows.slice(0, APPLICATION.pageSize),
    last = items.at(-1);
  return {
    items,
    nextCursor:
      rows.length > APPLICATION.pageSize && last
        ? Buffer.from(
            JSON.stringify({ time: last.cursorTime, id: last.id })
          ).toString('base64url')
        : null,
  };
}
