import { registerApplicationRoutes } from './modules/applications/routes.js';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import { SERVER } from './config/constants.js';
import type { AppOptions } from './http/context.js';
import { registerErrorHandler } from './http/errors.js';
import { createSessionGuard } from './http/session.js';
import { registerAuthRoutes } from './modules/auth/routes.js';
import { registerPublicCampaignRoutes } from './modules/campaigns/public-routes.js';
import { registerCampaignRoutes } from './modules/campaigns/routes.js';
import { registerHealthRoutes } from './modules/health/routes.js';
import { registerProfileRoutes } from './modules/profiles/routes.js';

export function buildApp(options: AppOptions) {
  const app = Fastify({
    logger: options.logger
      ? {
          serializers: {
            req(request) {
              return {
                method: request.method,
                url: request.url?.split('?')[0],
              };
            },
          },
          redact: [
            'req.headers.cookie',
            'req.headers.authorization',
            'res.headers.set-cookie',
          ],
        }
      : false,
    bodyLimit: SERVER.jsonBodyLimit,
  });
  app.register(cors, {
    origin: options.origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
  });
  app.register(rateLimit, {
    max: SERVER.requestsPerMinute,
    timeWindow: SERVER.rateWindow,
  });
  app.addHook('onClose', async () => {
    await options.beforeClose?.();
    await options.database.close();
  });
  registerErrorHandler(app);
  registerHealthRoutes(app, options);
  registerPublicCampaignRoutes(app, options);
  if (options.auth && options.profiles) {
    const authOptions = {
      ...options,
      auth: options.auth,
      profiles: options.profiles,
    };
    const requireSession = createSessionGuard(authOptions);
    registerAuthRoutes(app, authOptions);
    registerProfileRoutes(app, options.profiles, requireSession);
    if (options.applications)
      registerApplicationRoutes(app, options.applications, requireSession);
    if (options.campaigns)
      registerCampaignRoutes(app, options.campaigns, requireSession);
  }
  return app;
}
