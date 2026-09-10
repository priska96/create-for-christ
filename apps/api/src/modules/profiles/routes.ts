import {
  API_PATH,
  MESSAGES,
  meSchema,
  profileInputSchema,
} from '@create-for-christ/contracts';
import type { FastifyInstance } from 'fastify';
import type { SessionGuard } from '../../http/session.js';
import { parseInput } from '../../http/validation.js';
import type { ProfileStore } from './store.js';

export function registerProfileRoutes(
  app: FastifyInstance,
  profiles: ProfileStore,
  requireSession: SessionGuard
) {
  app.get(API_PATH.me, async (request) => {
    const session = await requireSession(request);
    return meSchema.parse({
      user: session.user,
      profile: await profiles.get(session.user.id),
    });
  });
  app.put(API_PATH.profile, async (request) => {
    const session = await requireSession(request);
    return profiles.save(
      session.user.id,
      parseInput(profileInputSchema, request.body, MESSAGES.profileInput)
    );
  });
}
