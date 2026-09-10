import { API_PATH, APP, AUTH, HTTP } from "@create-for-christ/contracts";
import { fromNodeHeaders } from "better-auth/node";
import type { FastifyInstance } from "fastify";
import type { AuthOptions } from "../../http/context.js";
import { registerAuthPages } from "./pages.js";
export function registerAuthRoutes(app: FastifyInstance, options: AuthOptions) {
  const auth = options.auth;
  const baseUrl = options.authBaseUrl ?? APP.defaultApiUrl;
  registerAuthPages(app);
  const allowedAuthPaths = new Set([
    "sign-up/email",
    "sign-in/email",
    "sign-out",
    "get-session",
    "send-verification-email",
    "verify-email",
    "request-password-reset",
    "reset-password",
  ]);
  app.route({
    method: ["GET", "POST"],
    url: API_PATH.auth,
    async handler(request, reply) {
      const path = new URL(request.url, baseUrl).pathname.slice(
        API_PATH.authPrefix.length,
      );
      if (!allowedAuthPaths.has(path) && !/^reset-password\/[^/]+$/.test(path))
        return reply.code(HTTP.notFound).send({ error: "Not found" });
      const headers = fromNodeHeaders(request.headers);
      // Override any client-supplied value with the socket IP resolved by Fastify.
      headers.set(AUTH.clientIpHeader, request.ip);
      const response = await auth.handler(
        new Request(new URL(request.url, baseUrl), {
          method: request.method,
          headers,
          ...(request.method === "POST"
            ? { body: JSON.stringify(request.body ?? {}) }
            : {}),
        }),
      );
      reply.code(response.status);
      response.headers.forEach((value, key) => {
        if (key !== "set-cookie") reply.header(key, value);
      });
      const cookies = response.headers.getSetCookie();
      if (cookies.length) reply.header("set-cookie", cookies);
      return reply.send(await response.text());
    },
  });
}
