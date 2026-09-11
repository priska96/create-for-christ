import { createApplicationStore } from './modules/applications/store.js';
import pg from 'pg';
import { buildApp } from './app.js';
import { DATABASE } from './config/constants.js';
import { readConfig } from './config/environment.js';
import { createDatabase } from './infrastructure/database.js';
import { createMailer } from './infrastructure/mail.js';
import { createAuth } from './modules/auth/service.js';
import { createCampaignStore } from './modules/campaigns/store.js';
import { createProfileStore } from './modules/profiles/store.js';

const config = readConfig();
const pool = new pg.Pool({
  connectionString: config.DATABASE_URL,
  max: DATABASE.poolSize,
  connectionTimeoutMillis: DATABASE.connectionTimeoutMs,
});
const mailer = createMailer(pool, config);
const auth = createAuth(pool, config, mailer.enqueue);
const app = buildApp({
  database: createDatabase(config.DATABASE_URL, pool),
  origins: config.CORS_ORIGINS.split(',')
    .map((value) => value.trim())
    .filter(Boolean),
  logger: true,
  auth,
  profiles: createProfileStore(pool),
  campaigns: createCampaignStore(pool),
  applications: createApplicationStore(pool),
  authBaseUrl: config.AUTH_BASE_URL,
  beforeClose: () => mailer.close(),
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void app.close().catch(() => {
      process.exitCode = 1;
    });
  });
}
try {
  await app.listen({ host: config.HOST, port: config.PORT });
  mailer.start();
} catch (error) {
  app.log.error(error);
  await app.close();
  process.exitCode = 1;
}
