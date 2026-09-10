import { APP, HTTP, MESSAGES, ROLE } from "@create-for-christ/contracts";
import { fromNodeHeaders } from "better-auth/node";
import type { FastifyRequest } from "fastify";
import type { AuthOptions } from "./context.js";
import { RequestError } from "./errors.js";
export function createSessionGuard(options: AuthOptions) {
  const trustedOrigins = new Set([
    ...options.origins,
    options.authBaseUrl ?? APP.defaultApiUrl,
    APP.origin,
  ]);
  return async (request: FastifyRequest, brandOnly = false) => {
    const session = await options.auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });
    if (!session) throw new RequestError(HTTP.unauthorized, MESSAGES.signIn);
    if (!session.user.emailVerified)
      throw new RequestError(HTTP.forbidden, MESSAGES.verifyEmail);
    // Reads need authentication; mutations additionally require an explicit trusted origin.
    if (
      !["GET", "HEAD"].includes(request.method) &&
      (!request.headers.origin || !trustedOrigins.has(request.headers.origin))
    )
      throw new RequestError(HTTP.forbidden, MESSAGES.untrustedOrigin);
    if (brandOnly) {
      const profile = await options.profiles.get(session.user.id);
      if (profile?.details.role !== ROLE.brand)
        throw new RequestError(HTTP.forbidden, MESSAGES.brandOnly);
    }
    return session;
  };
}
export type SessionGuard = ReturnType<typeof createSessionGuard>;
