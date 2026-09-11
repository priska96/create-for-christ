import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import {
  APPLICATION,
  APPLICATION_STATUS,
  type CampaignInput,
  type ProfileInput,
} from '@create-for-christ/contracts';
import pg from 'pg';
import sharp from 'sharp';
import {
  saveCampaignImage,
  deleteCampaignImage,
} from '../src/modules/campaigns/images.js';
import { buildApp } from '../src/app.js';
import { readConfig } from '../src/config/environment.js';
import { createDatabase } from '../src/infrastructure/database.js';
import type { AuthMail } from '../src/infrastructure/mail.js';
import { createAuth } from '../src/modules/auth/service.js';
import { createApplicationStore } from '../src/modules/applications/store.js';
import { createCampaignStore } from '../src/modules/campaigns/store.js';
import { createProfileStore } from '../src/modules/profiles/store.js';

const campaignInput: CampaignInput = {
  title: 'Ein Reel für unsere Brand',
  productName: 'Kaffee',
  description: 'Zeige deine Morgenroutine.',
  compensation: { type: 'barter', productValueMinor: 2500 },
  currency: 'EUR',
  reelCount: 1,
  reelLengthSeconds: 30,
  creatorSlots: 1,
  contentDeadline: null,
  shippingRequired: true,
  shippingNotes: 'Versand innerhalb Deutschlands',
  requiredMentions: ['brand'],
  minPostingDurationDays: 30,
  usageDurationDays: null,
  usageChannels: [],
  usagePaidAdsAllowed: false,
};
const creatorProfile: ProfileInput = {
  role: 'creator',
  displayName: 'Creator',
  bio: 'Reels mit Herz',
  instagramHandle: 'creator.test',
  location: 'Berlin',
  languages: ['Deutsch'],
  topics: ['Food'],
  dealPreferences: ['barter', 'paid'],
  portfolioUrls: ['https://www.instagram.com/reel/example/'],
};
const brandProfile: ProfileInput = {
  role: 'brand',
  displayName: 'Kontakt',
  brandName: 'Test Brand',
  description: 'Kaffee',
  website: '',
  industry: 'Food',
  location: 'Hamburg',
};

test('real PostgreSQL: applications, snapshots, authorization and concurrent capacity', async (t) => {
  const config = { ...readConfig(), NODE_ENV: 'test' as const };
  const schema = `cfc_applications_${randomUUID().replaceAll('-', '')}`;
  const admin = new pg.Client({ connectionString: config.DATABASE_URL });
  await admin.connect();
  await admin.query(`CREATE SCHEMA "${schema}"`);
  const pool = new pg.Pool({
    connectionString: config.DATABASE_URL,
    options: `-c search_path=${schema}`,
    max: 8,
  });
  const mail: AuthMail[] = [];
  const origin = config.CORS_ORIGINS.split(',')[0]!;
  const profiles = createProfileStore(pool),
    campaigns = createCampaignStore(pool),
    applications = createApplicationStore(pool);
  const directory = new URL('../migrations/', import.meta.url);
  for (const file of (await readdir(directory))
    .filter((name) => name.endsWith('.sql'))
    .sort())
    await pool.query(await readFile(new URL(file, directory), 'utf8'));
  const auth = createAuth(pool, config, async (message) => {
    mail.push(message);
  });
  const app = buildApp({
    database: createDatabase(config.DATABASE_URL, pool),
    auth,
    profiles,
    campaigns,
    applications,
    origins: [origin],
    authBaseUrl: config.AUTH_BASE_URL,
  });
  t.after(async () => {
    await app.close();
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
  });
  // Unique remote IPs keep feature assertions independent of the rate-limit window.
  let requestNumber = 0;
  const request = (
    method: 'GET' | 'POST' | 'PUT',
    url: string,
    cookie = '',
    payload?: object,
    requestOrigin = origin
  ) =>
    app.inject({
      method,
      url,
      remoteAddress: `127.1.${Math.floor(++requestNumber / 250)}.${(requestNumber % 250) + 1}`,
      headers: { cookie, origin: requestOrigin },
      ...(payload ? { payload } : {}),
    });
  async function account(name: string, profile: ProfileInput) {
    const email = `${name}@example.test`,
      password = 'Local-test-password-123';
    const signup = await request('POST', '/api/auth/sign-up/email', '', {
      name,
      email,
      password,
    });
    assert.equal(signup.statusCode, 200, signup.body);
    const message = mail.find((item) => item.to === email)!;
    const url = new URL(message.text.match(/https?:\/\/[^\s]+/)![0]);
    assert.ok(
      [200, 302].includes(
        (await request('GET', url.pathname + url.search)).statusCode
      )
    );
    const login = await request('POST', '/api/auth/sign-in/email', '', {
      email,
      password,
    });
    assert.equal(login.statusCode, 200, login.body);
    const cookies = login.headers['set-cookie'];
    const cookie = (Array.isArray(cookies) ? cookies : [cookies ?? ''])
      .map((item) => item.split(';')[0])
      .join('; ');
    const id: string = login.json().user.id;
    const own = await profiles.save(id, profile);
    return { id, cookie, profileId: own.id };
  }
  const brand = await account('brand', brandProfile),
    otherBrand = await account('other-brand', brandProfile);
  const first = await account('creator-one', creatorProfile),
    second = await account('creator-two', creatorProfile);
  const third = await account('creator-three', {
    ...creatorProfile,
    dealPreferences: ['barter'],
  });
  async function published(input: CampaignInput = campaignInput) {
    const campaign = await campaigns.create(brand.id, input);
    await campaigns.publish(brand.id, campaign.id);
    return campaign.id;
  }
  async function version(id: string) {
    return (
      await pool.query('SELECT revision FROM campaigns WHERE id=$1', [id])
    ).rows[0].revision as number;
  }
  async function apply(id: string, creator = first) {
    const response = await request(
      'POST',
      `/v1/creator/campaigns/${id}/applications`,
      creator.cookie,
      { pitch: 'Ich passe zu euch.', campaignVersion: await version(id) }
    );
    assert.equal(response.statusCode, 200, response.body);
    return response.json();
  }
  await t.test(
    'roles, ownership, verification, CSRF and strict inputs',
    async () => {
      const id = await published();
      assert.equal((await request('GET', '/v1/creator/feed')).statusCode, 401);
      assert.equal(
        (await request('GET', '/v1/creator/feed', brand.cookie)).statusCode,
        403
      );
      assert.equal(
        (
          await request(
            'GET',
            `/v1/brand/campaigns/${id}/applications`,
            first.cookie
          )
        ).statusCode,
        403
      );
      assert.equal(
        (
          await request(
            'GET',
            `/v1/brand/campaigns/${id}/applications`,
            otherBrand.cookie
          )
        ).statusCode,
        404
      );
      assert.equal(
        (await request('GET', '/v1/creator/feed?cursor=invalid', first.cookie))
          .statusCode,
        400
      );
      assert.equal(
        (
          await request(
            'GET',
            '/v1/creator/feed?creatorId=anything',
            first.cookie
          )
        ).statusCode,
        400
      );
      assert.equal(
        (
          await request(
            'POST',
            `/v1/creator/campaigns/${id}/dismiss`,
            first.cookie,
            undefined,
            'https://evil.test'
          )
        ).statusCode,
        403
      );
      assert.equal(
        (
          await request(
            'POST',
            `/v1/creator/campaigns/${id}/applications`,
            first.cookie,
            {
              pitch: '',
              campaignVersion: await version(id),
              creatorId: second.profileId,
            }
          )
        ).statusCode,
        400
      );
      assert.equal(
        (
          await request(
            'POST',
            `/v1/creator/campaigns/${id}/applications`,
            first.cookie,
            {
              pitch: 'a'.repeat(APPLICATION.pitchLength + 1),
              campaignVersion: await version(id),
            }
          )
        ).statusCode,
        400
      );
      assert.equal(
        (
          await request(
            'POST',
            `/v1/creator/campaigns/${randomUUID()}/dismiss`,
            first.cookie
          )
        ).statusCode,
        404
      );
      assert.equal(
        (
          await request(
            'POST',
            '/v1/creator/campaigns/not-a-uuid/dismiss',
            first.cookie
          )
        ).statusCode,
        400
      );
      await pool.query(
        'UPDATE auth_users SET "emailVerified"=false WHERE id=$1',
        [third.id]
      );
      assert.equal(
        (await request('GET', '/v1/creator/feed', third.cookie)).statusCode,
        403
      );
      await pool.query(
        'UPDATE auth_users SET "emailVerified"=true WHERE id=$1',
        [third.id]
      );
      const application = await apply(id);
      assert.equal(
        (
          await request(
            'POST',
            `/v1/brand/applications/${application.id}/accept`,
            otherBrand.cookie
          )
        ).statusCode,
        404
      );
      assert.equal(
        (
          await request(
            'POST',
            `/v1/brand/applications/${application.id}/accept`,
            first.cookie
          )
        ).statusCode,
        403
      );
      assert.equal(
        (await request('GET', '/v1/brand/applications', first.cookie))
          .statusCode,
        403
      );
      const inbox = await request(
        'GET',
        '/v1/brand/applications',
        brand.cookie
      );
      assert.equal(inbox.statusCode, 200, inbox.body);
      assert.ok(
        inbox
          .json()
          .applications.some(
            (item: { id: string }) => item.id === application.id
          )
      );
      assert.equal(
        (
          await request('GET', '/v1/brand/applications', otherBrand.cookie)
        ).json().applications.length,
        0
      );
      const own = await request(
        'GET',
        '/v1/creator/applications',
        first.cookie
      );
      assert.equal(own.headers['cache-control'], 'no-store');
      assert.equal(own.json().applications[0].creator.email, undefined);
      assert.equal(own.json().applications[0].creator.authId, undefined);
      assert.equal(
        (await applications.listOwn(second.id, {})).applications.length,
        0
      );
    }
  );
  await t.test(
    'feed eligibility, deal preference and durable/idempotent dismissal',
    async () => {
      const paid = await published({
        ...campaignInput,
        compensation: { type: 'paid', amountPerReelMinor: 15000 },
      });
      const hidden = [
        (await campaigns.create(brand.id, campaignInput)).id,
        await published(),
        await published(),
        await published(),
      ];
      await campaigns.close(brand.id, hidden[1]!);
      await pool.query(
        "UPDATE campaigns SET application_deadline=now()-interval '1 day' WHERE id=$1",
        [hidden[2]]
      );
      await pool.query(
        "UPDATE campaigns SET content_deadline=now()-interval '1 day' WHERE id=$1",
        [hidden[3]]
      );
      const dismissed = await published();
      for (let attempt = 0; attempt < 2; attempt++)
        assert.equal(
          (
            await request(
              'POST',
              `/v1/creator/campaigns/${dismissed}/dismiss`,
              third.cookie
            )
          ).statusCode,
          200
        );
      const feed = await request('GET', '/v1/creator/feed', third.cookie);
      assert.equal(feed.statusCode, 200, feed.body);
      assert.equal(feed.headers['cache-control'], 'no-store');
      assert.ok(
        feed
          .json()
          .campaigns.every(
            (item: { id: string }) =>
              ![paid, dismissed, ...hidden].includes(item.id)
          )
      );
      assert.equal(
        (await applications.feed(third.id, { dealType: 'paid' })).campaigns
          .length,
        0
      );
      assert.ok(
        (
          await applications.feed(first.id, { dealType: 'paid' })
        ).campaigns.some((item) => item.id === paid)
      );
      assert.equal(
        (
          await request(
            'POST',
            `/v1/creator/campaigns/${dismissed}/applications`,
            third.cookie,
            { pitch: '', campaignVersion: await version(dismissed) }
          )
        ).statusCode,
        409
      );
      for (const id of hidden)
        assert.equal(
          (
            await request(
              'POST',
              `/v1/creator/campaigns/${id}/applications`,
              first.cookie,
              { pitch: '', campaignVersion: await version(id) }
            )
          ).statusCode,
          409
        );
    }
  );
  await t.test(
    'stale confirmation rejected, application retries idempotent and terms immutable',
    async () => {
      const id = await published(),
        previousVersion = await version(id);
      await campaigns.update(brand.id, id, {
        ...campaignInput,
        title: 'Aktuelle Bedingungen',
      });
      assert.equal(
        (
          await request(
            'POST',
            `/v1/creator/campaigns/${id}/applications`,
            first.cookie,
            { pitch: '', campaignVersion: previousVersion }
          )
        ).statusCode,
        409
      );
      const responses = await Promise.all([apply(id), apply(id)]);
      assert.equal(responses[0].id, responses[1].id);
      assert.ok(
        !(await applications.feed(first.id, {})).campaigns.some(
          (item) => item.id === id
        )
      );
      assert.equal(
        (
          await request(
            'POST',
            `/v1/creator/campaigns/${id}/dismiss`,
            first.cookie
          )
        ).statusCode,
        409
      );
      await campaigns.update(brand.id, id, {
        ...campaignInput,
        title: 'Später geändert',
        compensation: { type: 'paid', amountPerReelMinor: 30000 },
      });
      const list = await request(
        'GET',
        `/v1/brand/campaigns/${id}/applications`,
        brand.cookie
      );
      assert.equal(list.statusCode, 200, list.body);
      assert.equal(
        list.json().applications[0].campaign.title,
        'Aktuelle Bedingungen'
      );
      assert.equal(
        list.json().applications[0].campaign.compensation.type,
        'barter'
      );
      const accepted = await request(
        'POST',
        `/v1/brand/applications/${responses[0].id}/accept`,
        brand.cookie
      );
      assert.equal(accepted.statusCode, 200, accepted.body);
      const collaboration = (
        await pool.query(
          'SELECT terms_snapshot,status FROM collaborations WHERE id=$1',
          [accepted.json().collaborationId]
        )
      ).rows[0];
      assert.deepEqual(collaboration.terms_snapshot, responses[0].campaign);
      assert.equal(collaboration.status, 'negotiating');
    }
  );
  await t.test(
    'simultaneous final-slot acceptance creates exactly one collaboration',
    async () => {
      const id = await published();
      const candidates = [await apply(id, first), await apply(id, second)];
      const results = await Promise.all(
        candidates.map((item) =>
          request(
            'POST',
            `/v1/brand/applications/${item.id}/accept`,
            brand.cookie
          )
        )
      );
      assert.deepEqual(
        results.map((result) => result.statusCode).sort(),
        [200, 409]
      );
      const winner = results
        .find((result) => result.statusCode === 200)!
        .json();
      const loser = candidates.find((item) => item.id !== winner.id)!;
      const repeat = await request(
        'POST',
        `/v1/brand/applications/${winner.id}/accept`,
        brand.cookie
      );
      assert.equal(repeat.statusCode, 200, repeat.body);
      assert.equal(repeat.json().collaborationId, winner.collaborationId);
      assert.equal(
        (
          await request(
            'POST',
            `/v1/brand/applications/${winner.id}/reject`,
            brand.cookie
          )
        ).statusCode,
        409
      );
      assert.equal(
        (
          await request(
            'POST',
            `/v1/creator/campaigns/${id}/applications`,
            third.cookie,
            { pitch: '', campaignVersion: await version(id) }
          )
        ).statusCode,
        409
      );
      assert.ok(
        !(await applications.feed(third.id, {})).campaigns.some(
          (item) => item.id === id
        )
      );
      assert.equal(
        (
          await pool.query(
            'SELECT count(*)::int AS total FROM collaborations co JOIN applications a ON a.id=co.application_id WHERE a.campaign_id=$1',
            [id]
          )
        ).rows[0].total,
        1
      );
      const rejected = await request(
        'POST',
        `/v1/brand/applications/${loser.id}/reject`,
        brand.cookie
      );
      assert.equal(rejected.statusCode, 200, rejected.body);
      assert.equal(rejected.json().status, APPLICATION_STATUS.rejected);
      assert.equal(rejected.json().collaborationId, null);
      assert.equal(
        (
          await request(
            'POST',
            `/v1/brand/applications/${loser.id}/reject`,
            brand.cookie
          )
        ).statusCode,
        200
      );
      const own = await applications.listOwn(first.id, {
        status: first.profileId === winner.creator.id ? 'accepted' : 'rejected',
      });
      assert.ok(own.applications.some((item) => item.id === candidates[0].id));
    }
  );
  await t.test(
    'closed campaigns, conflicting decisions and capacity reductions',
    async () => {
      const id = await published({ ...campaignInput, creatorSlots: 2 });
      const one = await apply(id),
        two = await apply(id, second),
        three = await apply(id, third);
      const race = await Promise.all(
        ['accept', 'reject'].map((decision) =>
          request(
            'POST',
            `/v1/brand/applications/${one.id}/${decision}`,
            brand.cookie
          )
        )
      );
      assert.deepEqual(
        race.map((response) => response.statusCode).sort(),
        [200, 409]
      );
      if (race[0]!.statusCode !== 200) {
        // Keep the capacity assertion deterministic regardless of which decision won.
        await applications.decide(brand.id, three.id, 'accepted');
      }
      await applications.decide(brand.id, two.id, 'accepted');
      assert.equal(
        (
          await request('PUT', `/v1/brand/campaigns/${id}`, brand.cookie, {
            ...campaignInput,
            creatorSlots: 1,
          })
        ).statusCode,
        409
      );
      const closedId = await published(),
        pending = await apply(closedId);
      await campaigns.close(brand.id, closedId);
      assert.equal(
        (
          await request(
            'POST',
            `/v1/brand/applications/${pending.id}/accept`,
            brand.cookie
          )
        ).statusCode,
        409
      );
      assert.equal(
        (
          await request(
            'POST',
            `/v1/brand/applications/${pending.id}/reject`,
            brand.cookie
          )
        ).statusCode,
        200
      );
    }
  );
  await t.test(
    'image replacement keeps files referenced by submitted terms',
    async () => {
      const id = await published();
      const urls: string[] = [];
      try {
        const bytes = await sharp({
          create: { width: 8, height: 8, channels: 3, background: '#36584A' },
        })
          .png()
          .toBuffer();
        async function upload() {
          return campaigns.setProductImage(brand.id, id, async () => {
            const url = await saveCampaignImage(bytes);
            urls.push(url);
            return url;
          });
        }
        await upload();
        const application = await apply(id);
        const updated = await upload();
        assert.notEqual(
          application.campaign.productImageUrl,
          updated.productImageUrl
        );
        assert.equal(
          (await app.inject(application.campaign.productImageUrl)).statusCode,
          200
        );
        assert.equal(
          (await app.inject(updated.productImageUrl!)).statusCode,
          200
        );
      } finally {
        await Promise.all(urls.map(deleteCampaignImage));
      }
    }
  );
  await t.test(
    'cursor pagination preserves equal timestamps and PostgreSQL microseconds',
    async () => {
      const pagingCreator = await account('paging-creator', creatorProfile);
      const ids: string[] = [];
      for (let index = 0; index < APPLICATION.pageSize + 3; index++) {
        const id = await published();
        ids.push(id);
        await pool.query(
          "UPDATE campaigns SET created_at='2099-01-01T00:00:00.123456Z' WHERE id=$1",
          [id]
        );
        await applications.apply(pagingCreator.id, id, {
          pitch: '',
          campaignVersion: await version(id),
        });
      }
      await pool.query(
        "UPDATE applications SET created_at='2099-01-01T00:00:00.123456Z' WHERE creator_id=$1",
        [pagingCreator.profileId]
      );
      const pageOne = await applications.listOwn(pagingCreator.id, {});
      assert.equal(pageOne.applications.length, APPLICATION.pageSize);
      assert.ok(pageOne.nextCursor);
      const pageTwo = await applications.listOwn(pagingCreator.id, {
        cursor: pageOne.nextCursor,
      });
      assert.equal(pageTwo.applications.length, 3);
      assert.equal(pageTwo.nextCursor, null);
      assert.equal(
        new Set(
          [...pageOne.applications, ...pageTwo.applications].map(
            (item) => item.id
          )
        ).size,
        ids.length
      );
      const feedOne = await applications.feed(third.id, {});
      assert.ok(feedOne.nextCursor);
      const feedTwo = await applications.feed(third.id, {
        cursor: feedOne.nextCursor,
      });
      const loaded = [...feedOne.campaigns, ...feedTwo.campaigns].map(
        (item) => item.id
      );
      assert.equal(loaded.filter((id) => ids.includes(id)).length, ids.length);
      assert.equal(new Set(loaded).size, loaded.length);
    }
  );
});
