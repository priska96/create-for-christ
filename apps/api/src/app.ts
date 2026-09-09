import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { campaignListSchema, dealTypeSchema } from '@create-for-christ/contracts';
import { z } from 'zod';
import type { Database } from './database.js';

export function buildApp(options: { database: Database; origins: string[]; logger?: boolean }) {
  const app = Fastify({ logger: options.logger ?? false, bodyLimit: 256 * 1024 });
  app.register(cors, { origin: options.origins });
  app.register(rateLimit, { max: 100, timeWindow: '1 minute' });
  app.addHook('onClose', () => options.database.close());
  app.get('/health', async () => ({ status: 'ok', service: 'create-for-christ-api' }));
  app.get('/ready', async (_request, reply) => {
    try {
      await options.database.ping();
      return { status: 'ok' };
    } catch {
      return reply.code(503).send({ status: 'unavailable' });
    }
  });
  // Public discovery only. No unauthenticated profile, application or chat mutations.
  app.get('/v1/campaigns', async (request, reply) => {
    const parsed = z.object({ dealType: dealTypeSchema.optional() }).strict().safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid campaign filter' });
    try {
      return campaignListSchema.parse({ campaigns: await options.database.listCampaigns(parsed.data.dealType) });
    } catch {
      request.log.error('Campaign listing failed');
      return reply.code(503).send({ error: 'Campaigns are temporarily unavailable' });
    }
  });
  return app;
}
