import pg from "pg";
import { readConfig } from "./config.js";
import { createDatabase } from "./database.js";
import { buildApp } from "./app.js";
import { createAuth } from "./auth.js";
import { createMailer } from "./mail.js";
import { createProfileStore } from "./profile-store.js";
import { createCampaignStore } from "./campaign-store.js";
const config = readConfig();
const pool = new pg.Pool({
  connectionString: config.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 3000,
});
const mailer = createMailer(pool, config);
const auth = createAuth(pool, config, mailer.enqueue);
const app = buildApp({
  database: createDatabase(config.DATABASE_URL, pool),
  origins: config.CORS_ORIGINS.split(",")
    .map((value) => value.trim())
    .filter(Boolean),
  logger: true,
  auth,
  profiles: createProfileStore(pool),
  campaigns: createCampaignStore(pool),
  authBaseUrl: config.AUTH_BASE_URL,
  beforeClose: () => mailer.close(),
});
for (const signal of ["SIGINT", "SIGTERM"] as const) {
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
