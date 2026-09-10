import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import {
  campaignListSchema,
  dealTypeSchema,
} from "@create-for-christ/contracts";
import { z } from "zod";
import type { Database } from "./database.js";
import { fromNodeHeaders } from "better-auth/node";
import type { Auth } from "./auth.js";
import { ProfileConflict, type ProfileStore } from "./profile-store.js";
import {
  CampaignForbidden,
  CampaignNotFound,
  CampaignStateError,
  type CampaignStore,
} from "./campaign-store.js";
import { readCampaignImage, saveCampaignImage, deleteCampaignImage, InvalidCampaignImage } from "./uploads.js";
import {
  profileInputSchema,
  meSchema,
  campaignInputSchema,
  campaignDetailSchema,
  campaignDetailListSchema,
  campaignImageInputSchema,
} from "@create-for-christ/contracts";
import { registerAuthPages } from "./auth-pages.js";

export function buildApp(options: {
  database: Database;
  origins: string[];
  logger?: boolean;
  auth?: Auth;
  profiles?: ProfileStore;
  campaigns?: CampaignStore;
  authBaseUrl?: string;
  beforeClose?: () => Promise<void>;
}) {
  const app = Fastify({
    logger: options.logger
      ? {
          serializers: {
            req(request) {
              return {
                method: request.method,
                url: request.url?.split("?")[0],
              };
            },
          },
          redact: [
            "req.headers.cookie",
            "req.headers.authorization",
            "res.headers.set-cookie",
          ],
        }
      : false,
    bodyLimit: 256 * 1024,
  });
  app.register(cors, {
    origin: options.origins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "OPTIONS"],
  });
  app.register(rateLimit, { max: 100, timeWindow: "1 minute" });
  app.addHook("onClose", async () => {
    await options.beforeClose?.();
    await options.database.close();
  });
  app.get("/health", async () => ({
    status: "ok",
    service: "create-for-christ-api",
  }));
  app.get("/ready", async (_request, reply) => {
    try {
      await options.database.ping();
      return { status: "ok" };
    } catch {
      return reply.code(503).send({ status: "unavailable" });
    }
  });
  // Public product images. Filenames are unguessable random IDs; no directory listing is exposed.
  app.get("/v1/uploads/campaigns/:file", async (request, reply) => {
    const image = await readCampaignImage(
      (request.params as { file: string }).file,
    );
    if (!image) return reply.code(404).send({ error: "Nicht gefunden." });
    reply.header("Cache-Control", "public, max-age=3600");
    reply.header("X-Content-Type-Options", "nosniff");
    return reply.type(image.mimeType).send(image.buffer);
  });
  // Public discovery only. No unauthenticated profile, application or chat mutations.
  app.get("/v1/campaigns", async (request, reply) => {
    const parsed = z
      .object({ dealType: dealTypeSchema.optional() })
      .strict()
      .safeParse(request.query);
    if (!parsed.success)
      return reply.code(400).send({ error: "Invalid campaign filter" });
    try {
      return campaignListSchema.parse({
        campaigns: await options.database.listCampaigns(parsed.data.dealType),
      });
    } catch {
      request.log.error("Campaign listing failed");
      return reply
        .code(503)
        .send({ error: "Campaigns are temporarily unavailable" });
    }
  });
  if (options.auth && options.profiles) {
    const auth = options.auth;
    const profiles = options.profiles;
    const baseUrl = options.authBaseUrl ?? "http://localhost:3001";
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
      url: "/api/auth/*",
      async handler(request, reply) {
        const path = new URL(request.url, baseUrl).pathname.slice(
          "/api/auth/".length,
        );
        if (
          !allowedAuthPaths.has(path) &&
          !/^reset-password\/[^/]+$/.test(path)
        )
          return reply.code(404).send({ error: "Not found" });
        const headers = fromNodeHeaders(request.headers);
        // Override any client-supplied value with the socket IP resolved by Fastify.
        headers.set("x-cfc-client-ip", request.ip);
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
    app.get("/v1/me", async (request, reply) => {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(request.headers),
      });
      if (!session)
        return reply.code(401).send({ error: "Bitte melde dich an." });
      if (!session.user.emailVerified)
        return reply
          .code(403)
          .send({ error: "Bitte bestätige deine E-Mail-Adresse." });
      return meSchema.parse({
        user: session.user,
        profile: await profiles.get(session.user.id),
      });
    });
    app.put("/v1/me/profile", async (request, reply) => {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(request.headers),
      });
      if (!session)
        return reply.code(401).send({ error: "Bitte melde dich an." });
      if (!session.user.emailVerified)
        return reply
          .code(403)
          .send({ error: "Bitte bestätige deine E-Mail-Adresse." });
      // CORS alone is not CSRF protection. Native clients explicitly send their app origin.
      const origin = request.headers.origin;
      if (
        !origin ||
        ![...options.origins, baseUrl, "create-for-christ://"].includes(origin)
      ) {
        return reply.code(403).send({ error: "Unzulässiger Ursprung." });
      }
      const parsed = profileInputSchema.safeParse(request.body);
      if (!parsed.success)
        return reply.code(400).send({
          error: "Bitte prüfe deine Profilangaben.",
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        });
      try {
        // The authenticated identity is the only source of ownership. No client IDs accepted.
        return await profiles.save(session.user.id, parsed.data);
      } catch (error) {
        if (error instanceof ProfileConflict)
          return reply.code(409).send({ error: error.message });
        throw error;
      }
    });
    async function requireBrandSession(
      request: FastifyRequest,
      reply: FastifyReply,
    ) {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(request.headers),
      });
      if (!session) {
        reply.code(401).send({ error: "Bitte melde dich an." });
        return null;
      }
      if (!session.user.emailVerified) {
        reply
          .code(403)
          .send({ error: "Bitte bestätige deine E-Mail-Adresse." });
        return null;
      }
      // CORS alone is not CSRF protection. Native clients explicitly send their app origin.
      const origin = request.headers.origin;
      if (
        !origin ||
        ![...options.origins, baseUrl, "create-for-christ://"].includes(origin)
      ) {
        reply.code(403).send({ error: "Unzulässiger Ursprung." });
        return null;
      }
      const profile = await profiles.get(session.user.id);
      if (!profile || profile.details.role !== "brand") {
        reply
          .code(403)
          .send({ error: "Nur Brands können Kampagnen verwalten." });
        return null;
      }
      return session;
    }
    if (options.campaigns) {
      const campaigns = options.campaigns;
      app.get("/v1/brand/campaigns", async (request, reply) => {
        const session = await requireBrandSession(request, reply);
        if (!session) return reply;
        try {
          return campaignDetailListSchema.parse({
            campaigns: await campaigns.listOwn(session.user.id),
          });
        } catch (error) {
          return handleCampaignError(error, reply);
        }
      });
      app.post("/v1/brand/campaigns", async (request, reply) => {
        const session = await requireBrandSession(request, reply);
        if (!session) return reply;
        const parsed = campaignInputSchema.safeParse(request.body);
        if (!parsed.success)
          return reply.code(400).send({
            error: "Bitte prüfe deine Kampagnenangaben.",
            issues: parsed.error.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message,
            })),
          });
        try {
          return campaignDetailSchema.parse(
            await campaigns.create(session.user.id, parsed.data),
          );
        } catch (error) {
          return handleCampaignError(error, reply);
        }
      });
      app.put("/v1/brand/campaigns/:id", async (request, reply) => {
        const session = await requireBrandSession(request, reply);
        if (!session) return reply;
        const id = z.uuid().safeParse((request.params as { id: string }).id);
        if (!id.success)
          return reply.code(400).send({ error: "Ungültige Kampagne." });
        const parsed = campaignInputSchema.safeParse(request.body);
        if (!parsed.success)
          return reply.code(400).send({
            error: "Bitte prüfe deine Kampagnenangaben.",
            issues: parsed.error.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message,
            })),
          });
        try {
          return campaignDetailSchema.parse(
            await campaigns.update(session.user.id, id.data, parsed.data),
          );
        } catch (error) {
          return handleCampaignError(error, reply);
        }
      });
      app.post("/v1/brand/campaigns/:id/publish", async (request, reply) => {
        const session = await requireBrandSession(request, reply);
        if (!session) return reply;
        const id = z.uuid().safeParse((request.params as { id: string }).id);
        if (!id.success)
          return reply.code(400).send({ error: "Ungültige Kampagne." });
        try {
          return campaignDetailSchema.parse(
            await campaigns.publish(session.user.id, id.data),
          );
        } catch (error) {
          return handleCampaignError(error, reply);
        }
      });
      app.post("/v1/brand/campaigns/:id/close", async (request, reply) => {
        const session = await requireBrandSession(request, reply);
        if (!session) return reply;
        const id = z.uuid().safeParse((request.params as { id: string }).id);
        if (!id.success)
          return reply.code(400).send({ error: "Ungültige Kampagne." });
        try {
          return campaignDetailSchema.parse(
            await campaigns.close(session.user.id, id.data),
          );
        } catch (error) {
          return handleCampaignError(error, reply);
        }
      });
      app.post(
        "/v1/brand/campaigns/:id/image",
        { bodyLimit: 7 * 1024 * 1024, config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
        async (request, reply) => {
          const session = await requireBrandSession(request, reply);
          if (!session) return reply;
          const id = z.uuid().safeParse((request.params as { id: string }).id);
          if (!id.success)
            return reply.code(400).send({ error: "Ungültige Kampagne." });
          const parsed = campaignImageInputSchema.safeParse(request.body);
          if (!parsed.success)
            return reply.code(400).send({ error: "Bitte ein Bild auswählen." });
          const buffer = Buffer.from(parsed.data.data, "base64");
          if (buffer.byteLength === 0)
            return reply.code(400).send({ error: "Bitte ein Bild auswählen." });
          if (buffer.byteLength > 5 * 1024 * 1024)
            return reply
              .code(413)
              .send({ error: "Das Bild darf höchstens 5 MB groß sein." });
          let savedUrl: string | undefined;
          try {
            return campaignDetailSchema.parse(
              await campaigns.setProductImage(session.user.id, id.data, async () => {
                savedUrl = await saveCampaignImage(buffer);
                return savedUrl;
              }),
            );
          } catch (error) {
            if (savedUrl) await deleteCampaignImage(savedUrl);
            if (error instanceof InvalidCampaignImage) return reply.code(400).send({ error: error.message });
            return handleCampaignError(error, reply);
          }
        },
      );
    }
  }
  app.setErrorHandler((error, request, reply) => {
    const status =
      error instanceof Error &&
      "statusCode" in error &&
      typeof error.statusCode === "number"
        ? error.statusCode
        : 500;
    request.log.error({ err: error }, "Request failed");
    return reply
      .code(status >= 400 && status < 500 ? status : 500)
      .send({ error: "Die Anfrage konnte nicht verarbeitet werden." });
  });
  return app;
}
function handleCampaignError(error: unknown, reply: FastifyReply) {
  if (error instanceof CampaignForbidden)
    return reply.code(403).send({ error: error.message });
  if (error instanceof CampaignNotFound)
    return reply.code(404).send({ error: error.message });
  if (error instanceof CampaignStateError)
    return reply.code(409).send({ error: error.message });
  throw error;
}
