import { test as base, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'dotenv';
import pg from 'pg';
import sharp from 'sharp';
import type { CampaignInput, ProfileInput } from '@create-for-christ/contracts';
import type { AuthMail } from '../api/src/infrastructure/mail.js';
import type { Config } from '../api/src/config/environment.js';
import { createAuth } from '../api/src/modules/auth/service.js';
import { createDatabase } from '../api/src/infrastructure/database.js';
import { createProfileStore } from '../api/src/modules/profiles/store.js';
import { createCampaignStore } from '../api/src/modules/campaigns/store.js';
import { createApplicationStore } from '../api/src/modules/applications/store.js';
import { buildApp } from '../api/src/app.js';
import {
  saveCampaignImage,
  deleteCampaignImage,
} from '../api/src/modules/campaigns/images.js';
import { mailLink } from './helpers.js';

async function withEnvironment(
  use: (environment: Environment) => Promise<void>
) {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const webDir = process.env.CFC_E2E_WEB_DIR;
  if (!webDir)
    throw new Error('Run npm run test:e2e from the repository root.');
  const local = await readFile(join(root, 'apps/api/.env'), 'utf8')
    .then(parse)
    .catch(() => ({}) as Record<string, string>);
  const databaseUrl = process.env.TEST_DATABASE_URL ?? local.DATABASE_URL;
  if (
    !databaseUrl ||
    !['localhost', '127.0.0.1', '[::1]'].includes(new URL(databaseUrl).hostname)
  )
    throw new Error(
      'E2E tests require local PostgreSQL via TEST_DATABASE_URL or apps/api/.env.'
    );
  const config: Config = {
    DATABASE_URL: databaseUrl,
    NODE_ENV: 'test',
    HOST: '127.0.0.1',
    PORT: 3101,
    AUTH_BASE_URL: 'http://localhost:3101',
    CORS_ORIGINS: 'http://localhost:3100',
    BETTER_AUTH_SECRET: randomUUID() + randomUUID(),
    SMTP_HOST: '127.0.0.1',
    SMTP_PORT: 1025,
    SMTP_SECURE: false,
    MAIL_FROM: 'test@example.test',
  };
  const schema = `cfc_e2e_${randomUUID().replaceAll('-', '')}`;
  const admin = new pg.Client({ connectionString: databaseUrl });
  await admin.connect();
  await admin.query(`CREATE SCHEMA "${schema}"`);
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    options: `-c search_path=${schema}`,
  });
  let app: ReturnType<typeof buildApp> | undefined, server: Server | undefined;
  const mail: AuthMail[] = [];
  let imageUrl: string | undefined;
  try {
    for (const file of (await readdir(join(root, 'apps/api/migrations')))
      .filter((name) => name.endsWith('.sql'))
      .sort())
      await pool.query(
        await readFile(join(root, 'apps/api/migrations', file), 'utf8')
      );
    const profiles = createProfileStore(pool),
      campaigns = createCampaignStore(pool);
    const auth = createAuth(pool, config, async (message) => {
      mail.push(message);
    });
    app = buildApp({
      database: createDatabase(config.DATABASE_URL, pool),
      origins: ['http://localhost:3100'],
      auth,
      campaigns,
      applications: createApplicationStore(pool),
      profiles,
      authBaseUrl: config.AUTH_BASE_URL,
    });
    await app.listen({ port: 3101, host: '127.0.0.1' });
    server = createServer(async (req, res) => {
      const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
      let path = join(webDir, pathname);
      try {
        let bytes;
        try {
          bytes = await readFile(path);
        } catch {
          path = join(webDir, 'index.html');
          bytes = await readFile(path);
        }
        const mime: Record<string, string> = {
          '.html': 'text/html',
          '.js': 'application/javascript',
          '.css': 'text/css',
          '.png': 'image/png',
          '.ttf': 'font/ttf',
        };
        res.writeHead(200, {
          'content-type': mime[extname(path)] ?? 'application/octet-stream',
        });
        res.end(bytes);
      } catch {
        res.writeHead(500);
        res.end();
      }
    });
    await new Promise<void>((resolve) =>
      server!.listen(3100, '127.0.0.1', resolve)
    );
    const password = 'My-local-test-password-123';
    async function account(name: string, profile: ProfileInput) {
      const email = `${name}@example.test`;
      const signup = await app!.inject({
        method: 'POST',
        url: '/api/auth/sign-up/email',
        headers: { origin: 'http://localhost:3100' },
        payload: { name, email, password },
      });
      assert.equal(signup.statusCode, 200, signup.body);
      const url = new URL(mailLink(mail, email));
      const verified = await app!.inject(url.pathname + url.search);
      assert.ok([200, 302].includes(verified.statusCode));
      await profiles.save(signup.json().user.id, profile);
      return { id: signup.json().user.id, email };
    }
    const brand = await account('browser-brand', {
      role: 'brand',
      displayName: 'Brand Kontakt',
      brandName: 'Grace Coffee',
      description: 'Fairer Kaffee',
      website: '',
      industry: 'Food',
      location: 'Berlin',
    });
    const creator = await account('browser-creator', {
      role: 'creator',
      displayName: 'Anna Creator',
      bio: 'Reels mit Freude',
      instagramHandle: 'anna.test',
      location: 'Berlin',
      languages: ['Deutsch'],
      topics: ['Food'],
      dealPreferences: ['barter', 'paid'],
      portfolioUrls: ['https://www.instagram.com/reel/example/'],
    });
    const input: CampaignInput = {
      title: 'Kaffee am Morgen',
      productName: 'Grace Coffee',
      description: 'Zeige deine Morgenroutine mit einer Tasse Kaffee.',
      compensation: { type: 'barter', productValueMinor: 2500 },
      currency: 'EUR',
      reelCount: 1,
      reelLengthSeconds: 30,
      creatorSlots: 1,
      contentDeadline: null,
      shippingRequired: true,
      shippingNotes: 'Versand innerhalb Deutschlands',
      requiredMentions: ['grace.coffee'],
      minPostingDurationDays: 30,
      usageDurationDays: 30,
      usageChannels: ['Instagram'],
      usagePaidAdsAllowed: false,
    };
    const rejectCampaign = await campaigns.create(brand.id, {
      ...input,
      title: 'Für später',
    });
    await campaigns.publish(brand.id, rejectCampaign.id);
    const skipCampaign = await campaigns.create(brand.id, {
      ...input,
      title: 'Kaffee unterwegs',
    });
    await campaigns.publish(brand.id, skipCampaign.id);
    const acceptCampaign = await campaigns.create(brand.id, input);
    const bytes = await sharp({
      create: { width: 600, height: 300, channels: 3, background: '#65816d' },
    })
      .png()
      .toBuffer();
    await campaigns.setProductImage(brand.id, acceptCampaign.id, async () => {
      imageUrl = await saveCampaignImage(bytes);
      return imageUrl;
    });
    await campaigns.publish(brand.id, acceptCampaign.id);

    await use({ app, pool, mail, brand, creator, campaigns, input, password });
  } finally {
    if (server)
      await new Promise<void>((resolve, reject) =>
        server!.close((error) => (error ? reject(error) : resolve()))
      );
    const images = await pool
      .query<{ product_image_url: string }>(
        'SELECT product_image_url FROM campaigns WHERE product_image_url IS NOT NULL'
      )
      .catch(() => ({ rows: [] }));
    for (const url of new Set([
      imageUrl,
      ...images.rows.map((row) => row.product_image_url),
    ]))
      if (url) await deleteCampaignImage(url);
    if (app) await app.close();
    else await pool.end();
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
  }
}
type Environment = {
  app: ReturnType<typeof buildApp>;
  pool: pg.Pool;
  mail: AuthMail[];
  brand: { id: string; email: string };
  creator: { id: string; email: string };
  campaigns: ReturnType<typeof createCampaignStore>;
  input: CampaignInput;
  password: string;
};
export const test = base.extend<{
  environment: Environment;
  browserErrors: string[];
}>({
  environment: async ({ browser }, use) => {
    expect(browser.isConnected()).toBe(true);
    await withEnvironment(use);
  },
  browserErrors: [
    async ({ context }, use) => {
      const errors: string[] = [];
      context.on('page', (page) =>
        page.on('pageerror', (error) => errors.push(error.message))
      );
      await use(errors);
      expect(errors).toEqual([]);
    },
    { auto: true },
  ],
});
export { expect } from '@playwright/test';
