import {
  APPLICATION,
  APPLICATION_MESSAGE,
  APPLICATION_PATH,
  APPLICATION_STATUS,
  applicationInputSchema,
  applicationPageSchema,
  applicationQuerySchema,
  applicationSchema,
  feedPageSchema,
  feedQuerySchema,
} from '@create-for-christ/contracts';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { SERVER } from '../../config/constants.js';
import type { SessionGuard } from '../../http/session.js';
import { parseInput } from '../../http/validation.js';
import type { ApplicationStore } from './store.js';
const idSchema = z.object({ id: z.uuid() }).strict();
const paramsId = (params: unknown) =>
  parseInput(idSchema, params, APPLICATION_MESSAGE.invalid).id;
const emptyBody = z.object({}).strict();
export function registerApplicationRoutes(
  app: FastifyInstance,
  store: ApplicationStore,
  requireSession: SessionGuard
) {
  const mutation = {
    config: {
      rateLimit: {
        max: APPLICATION.requestsPerMinute,
        timeWindow: SERVER.rateWindow,
      },
    },
  };
  app.get(APPLICATION_PATH.feed, async (request) => {
    const session = await requireSession(request);
    return feedPageSchema.parse(
      await store.feed(
        session.user.id,
        parseInput(
          feedQuerySchema,
          request.query,
          APPLICATION_MESSAGE.invalidQuery
        )
      )
    );
  });
  app.get(APPLICATION_PATH.own, async (request) => {
    const session = await requireSession(request);
    return applicationPageSchema.parse(
      await store.listOwn(
        session.user.id,
        parseInput(
          applicationQuerySchema,
          request.query,
          APPLICATION_MESSAGE.invalidQuery
        )
      )
    );
  });
  app.get(APPLICATION_PATH.brandInbox, async (request) => {
    const session = await requireSession(request, true);
    return applicationPageSchema.parse(
      await store.listBrandInbox(
        session.user.id,
        parseInput(
          applicationQuerySchema,
          request.query,
          APPLICATION_MESSAGE.invalidQuery
        )
      )
    );
  });
  app.get(APPLICATION_PATH.brand, async (request) => {
    const session = await requireSession(request, true);
    return applicationPageSchema.parse(
      await store.listBrand(
        session.user.id,
        paramsId(request.params),
        parseInput(
          applicationQuerySchema,
          request.query,
          APPLICATION_MESSAGE.invalidQuery
        )
      )
    );
  });
  app.post(APPLICATION_PATH.apply, mutation, async (request) => {
    const session = await requireSession(request);
    return applicationSchema.parse(
      await store.apply(
        session.user.id,
        paramsId(request.params),
        parseInput(
          applicationInputSchema,
          request.body,
          APPLICATION_MESSAGE.invalid
        )
      )
    );
  });
  app.post(APPLICATION_PATH.dismiss, mutation, async (request) => {
    const session = await requireSession(request);
    parseInput(emptyBody, request.body ?? {}, APPLICATION_MESSAGE.invalid);
    return store.dismiss(session.user.id, paramsId(request.params));
  });
  for (const [path, status] of [
    [APPLICATION_PATH.accept, APPLICATION_STATUS.accepted],
    [APPLICATION_PATH.reject, APPLICATION_STATUS.rejected],
  ] as const) {
    app.post(path, mutation, async (request) => {
      const session = await requireSession(request, true);
      parseInput(emptyBody, request.body ?? {}, APPLICATION_MESSAGE.invalid);
      return applicationSchema.parse(
        await store.decide(session.user.id, paramsId(request.params), status)
      );
    });
  }
  app.addHook('onSend', async (request, reply, payload) => {
    if (
      request.url.startsWith('/v1/creator/') ||
      request.url.startsWith('/v1/brand/')
    )
      reply.header('Cache-Control', 'no-store');
    return payload;
  });
}
