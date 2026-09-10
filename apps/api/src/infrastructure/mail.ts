import { AUTH } from '@create-for-christ/contracts';
import nodemailer from 'nodemailer';
import type pg from 'pg';
import { MAIL } from '../config/constants.js';
import type { Config } from '../config/environment.js';

export type AuthMail = { to: string; subject: string; text: string };
export type SendAuthMail = (mail: AuthMail) => Promise<void>;
export function createMailer(pool: pg.Pool, config: Config) {
  const transport = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_SECURE,
    ...(config.SMTP_USER
      ? { auth: { user: config.SMTP_USER, pass: config.SMTP_PASSWORD } }
      : {}),
    connectionTimeout: MAIL.connectionTimeoutMs,
    greetingTimeout: MAIL.connectionTimeoutMs,
    socketTimeout: MAIL.socketTimeoutMs,
  });
  const enqueue: SendAuthMail = async (mail) => {
    await pool.query(
      'INSERT INTO auth_mail_outbox(recipient,subject,body) VALUES ($1,$2,$3)',
      [mail.to, mail.subject, mail.text]
    );
  };
  let timer: NodeJS.Timeout | undefined;
  let pending: Promise<void> | undefined;
  async function deliver() {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Tokens expire after an hour. Never keep sensitive mail bodies indefinitely.
      await client.query(
        "DELETE FROM auth_mail_outbox WHERE created_at < now() - $1 * interval '1 second'",
        [AUTH.tokenLifetimeSeconds]
      );
      const {
        rows: [mail],
      } = await client.query(
        `SELECT * FROM auth_mail_outbox WHERE available_at <= now() AND attempts < $1
        ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED`,
        [MAIL.maxAttempts]
      );
      if (mail) {
        try {
          await transport.sendMail({
            from: config.MAIL_FROM,
            to: mail.recipient,
            subject: mail.subject,
            text: mail.body,
          });
          await client.query('DELETE FROM auth_mail_outbox WHERE id=$1', [
            mail.id,
          ]);
        } catch {
          await client.query(
            "UPDATE auth_mail_outbox SET attempts=attempts+1,available_at=now()+$2 * interval '1 second' WHERE id=$1",
            [mail.id, MAIL.retryDelaySeconds]
          );
          console.error(
            'Auth email delivery failed; retry scheduled. Check SMTP configuration.'
          );
        }
      }
      await client.query('COMMIT');
    } catch {
      await client.query('ROLLBACK').catch(() => {});
      console.error('Auth email worker failed. Check database/migrations.');
    } finally {
      client.release();
    }
  }
  return {
    enqueue,
    start() {
      if (timer) return;
      timer = setInterval(() => {
        if (!pending)
          pending = deliver()
            .catch(() => console.error('Auth mail worker unavailable.'))
            .finally(() => {
              pending = undefined;
            });
      }, MAIL.pollIntervalMs);
      timer.unref();
    },
    async close() {
      if (timer) clearInterval(timer);
      await pending;
      transport.close();
    },
  };
}
