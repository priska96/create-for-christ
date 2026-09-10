import { API_PATH, APP, HTTP } from '@create-for-christ/contracts';
import type { FastifyInstance } from 'fastify';
import type { AppOptions } from '../../http/context.js';

export function registerHealthRoutes(
  app: FastifyInstance,
  options: AppOptions
) {
  app.get(API_PATH.health, async () => ({
    status: 'ok',
    service: APP.service,
  }));
  app.get(API_PATH.ready, async (_request, reply) => {
    try {
      await options.database.ping();
      return { status: 'ok' };
    } catch {
      return reply.code(HTTP.unavailable).send({ status: 'unavailable' });
    }
  });
}
