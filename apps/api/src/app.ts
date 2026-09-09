import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { campaignListSchema, dealTypeSchema } from '@create-for-christ/contracts';
import { z } from 'zod';
import type { Database } from './database.js';
import { fromNodeHeaders } from 'better-auth/node';
import type { Auth } from './auth.js';
import { ProfileConflict, type ProfileStore } from './profile-store.js';
import { profileInputSchema, meSchema } from '@create-for-christ/contracts';
import { registerAuthPages } from './auth-pages.js';

export function buildApp(options: { database: Database; origins: string[]; logger?: boolean; auth?: Auth; profiles?: ProfileStore; authBaseUrl?: string; beforeClose?: () => Promise<void> }) {
  const app = Fastify({
    logger: options.logger ? { serializers: { req(request) { return { method: request.method, url: request.url?.split('?')[0] }; } },
      redact: ['req.headers.cookie','req.headers.authorization','res.headers.set-cookie'] } : false,
    bodyLimit: 256 * 1024,
  });
  app.register(cors, { origin: options.origins, credentials: true, methods: ['GET','POST','PUT','OPTIONS'] });
  app.register(rateLimit, { max: 100, timeWindow: '1 minute' });
  app.addHook('onClose', async () => { await options.beforeClose?.(); await options.database.close(); });
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
  if (options.auth && options.profiles) {
    const auth = options.auth;
    const profiles = options.profiles;
    const baseUrl = options.authBaseUrl ?? 'http://localhost:3001';
    registerAuthPages(app);
    const allowedAuthPaths = new Set(['sign-up/email','sign-in/email','sign-out','get-session','send-verification-email','verify-email','request-password-reset','reset-password']);
    app.route({
      method: ['GET','POST'], url: '/api/auth/*',
      async handler(request, reply) {
        const path = new URL(request.url, baseUrl).pathname.slice('/api/auth/'.length);
        if (!allowedAuthPaths.has(path) && !/^reset-password\/[^/]+$/.test(path)) return reply.code(404).send({ error: 'Not found' });
        const headers = fromNodeHeaders(request.headers);
        // Override any client-supplied value with the socket IP resolved by Fastify.
        headers.set('x-cfc-client-ip', request.ip);
        const response = await auth.handler(new Request(new URL(request.url, baseUrl), {
          method: request.method, headers,
          ...(request.method === 'POST' ? { body: JSON.stringify(request.body ?? {}) } : {}),
        }));
        reply.code(response.status);
        response.headers.forEach((value,key) => { if (key !== 'set-cookie') reply.header(key,value); });
        const cookies = response.headers.getSetCookie();
        if (cookies.length) reply.header('set-cookie',cookies);
        return reply.send(await response.text());
      },
    });
    app.get('/v1/me', async (request, reply) => {
      const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
      if (!session) return reply.code(401).send({ error: 'Bitte melde dich an.' });
      if (!session.user.emailVerified) return reply.code(403).send({ error: 'Bitte bestätige deine E-Mail-Adresse.' });
      return meSchema.parse({ user: session.user, profile: await profiles.get(session.user.id) });
    });
    app.put('/v1/me/profile', async (request, reply) => {
      const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
      if (!session) return reply.code(401).send({ error: 'Bitte melde dich an.' });
      if (!session.user.emailVerified) return reply.code(403).send({ error: 'Bitte bestätige deine E-Mail-Adresse.' });
      // CORS alone is not CSRF protection. Native clients explicitly send their app origin.
      const origin = request.headers.origin;
      if (!origin || ![...options.origins, baseUrl, 'create-for-christ://'].includes(origin)) {
        return reply.code(403).send({ error: 'Unzulässiger Ursprung.' });
      }
      const parsed = profileInputSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: 'Bitte prüfe deine Profilangaben.', issues: parsed.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })) });
      try {
        // The authenticated identity is the only source of ownership. No client IDs accepted.
        return await profiles.save(session.user.id, parsed.data);
      } catch (error) {
        if (error instanceof ProfileConflict) return reply.code(409).send({ error: error.message });
        throw error;
      }
    });
  }
  app.setErrorHandler((error, request, reply) => {
    const status = error instanceof Error && 'statusCode' in error && typeof error.statusCode === 'number' ? error.statusCode : 500;
    request.log.error('Request failed');
    return reply.code(status >= 400 && status < 500 ? status : 500).send({ error: 'Die Anfrage konnte nicht verarbeitet werden.' });
  });
  return app;
}
