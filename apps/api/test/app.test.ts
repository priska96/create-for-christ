import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildApp } from '../src/app.js';
import type { Database } from '../src/database.js';

const makeDatabase = (overrides: Partial<Database> = {}): Database => ({
  async ping() {}, async listCampaigns() { return []; }, async close() {}, ...overrides,
});

test('liveness survives a database outage, readiness and discovery report unavailable without leaking secrets', async t => {
  const fail = async (): Promise<never> => { throw new Error('postgresql://private:password@server/db'); };
  const app = buildApp({ database: makeDatabase({ ping: fail, listCampaigns: fail }), origins: [] });
  t.after(() => app.close());
  assert.equal((await app.inject('/health')).statusCode, 200);
  for (const url of ['/ready', '/v1/campaigns']) {
    const result = await app.inject(url);
    assert.equal(result.statusCode, 503);
    assert.doesNotMatch(result.body, /password|postgresql/);
  }
});

test('invalid filters never reach the database; valid filters are forwarded', async t => {
  const received: unknown[] = [];
  const app = buildApp({ database: makeDatabase({ async listCampaigns(deal) { received.push(deal); return []; } }), origins: [] });
  t.after(() => app.close());
  assert.equal((await app.inject('/v1/campaigns?dealType=invalid')).statusCode, 400);
  assert.equal((await app.inject('/v1/campaigns?unexpected=true')).statusCode, 400);
  assert.deepEqual(received, []);
  const result = await app.inject('/v1/campaigns?dealType=barter');
  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.json(), { campaigns: [] });
  assert.deepEqual(received, ['barter']);
});

test('the scaffold exposes no unauthenticated application or profile mutations', async t => {
  const app = buildApp({ database: makeDatabase(), origins: ['http://localhost:8081'] });
  t.after(() => app.close());
  for (const url of ['/v1/applications', '/v1/profiles']) {
    assert.equal((await app.inject({ method: 'POST', url, payload: {} })).statusCode, 404);
  }
  const response = await app.inject({ url: '/health', headers: { origin: 'https://untrusted.example' } });
  assert.equal(response.headers['access-control-allow-origin'], undefined);
});
