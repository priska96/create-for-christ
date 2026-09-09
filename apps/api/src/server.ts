import { readConfig } from './config.js';
import { createDatabase } from './database.js';
import { buildApp } from './app.js';

const config = readConfig();
const app = buildApp({
  database: createDatabase(config.DATABASE_URL),
  origins: config.CORS_ORIGINS.split(',').map(value => value.trim()).filter(Boolean),
  logger: true,
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => { void app.close().catch(() => { process.exitCode = 1; }); });
}
try {
  await app.listen({ host: config.HOST, port: config.PORT });
} catch (error) {
  app.log.error(error);
  await app.close();
  process.exitCode = 1;
}
