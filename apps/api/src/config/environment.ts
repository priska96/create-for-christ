import { APP } from '@create-for-christ/contracts';
import 'dotenv/config';
import { z } from 'zod';

const environment = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: z.string().url(),
  CORS_ORIGINS: z.string().default('http://localhost:8081'),
  AUTH_BASE_URL: z.url().default(APP.defaultApiUrl),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32)
    .refine(
      (value) => !value.startsWith('replace-with-'),
      'Generate a private secret first'
    ),
  SMTP_HOST: z.string().default('127.0.0.1'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  MAIL_FROM: z
    .string()
    .default('Create For Christ <noreply@createforchrist.local>'),
});
export type Config = z.infer<typeof environment>;
export function readConfig(): Config {
  const result = environment.safeParse(process.env);
  if (!result.success)
    throw new Error(
      `Invalid environment variables: ${result.error.issues.map((issue) => issue.path.join('.')).join(', ')}`
    );
  if (
    result.data.NODE_ENV === 'production' &&
    (!result.data.AUTH_BASE_URL.startsWith('https://') ||
      result.data.SMTP_HOST === '127.0.0.1' ||
      result.data.MAIL_FROM.includes('.local'))
  ) {
    throw new Error(
      'Production requires an HTTPS auth URL and a configured SMTP sender.'
    );
  }
  return result.data;
}
