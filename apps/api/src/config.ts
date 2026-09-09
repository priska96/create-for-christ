import 'dotenv/config';
import { z } from 'zod';

const environment = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: z.string().url(),
  CORS_ORIGINS: z.string().default('http://localhost:8081'),
});
export function readConfig() {
  const result = environment.safeParse(process.env);
  if (!result.success) {
    // Report field names, never the connection string or other secrets.
    throw new Error(`Invalid environment variables: ${result.error.issues.map(issue => issue.path.join('.')).join(', ')}`);
  }
  return result.data;
}
