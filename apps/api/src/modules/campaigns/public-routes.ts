import {
  API_PATH,
  campaignListSchema,
  dealTypeSchema,
  HTTP,
} from "@create-for-christ/contracts";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { SERVER } from "../../config/constants.js";
import type { AppOptions } from "../../http/context.js";
import { readCampaignImage } from "./images.js";
export function registerPublicCampaignRoutes(
  app: FastifyInstance,
  options: AppOptions,
) {
  // Public product images. Filenames are unguessable random IDs; no directory listing is exposed.
  app.get(API_PATH.image, async (request, reply) => {
    const image = await readCampaignImage(
      (request.params as { file: string }).file,
    );
    if (!image)
      return reply.code(HTTP.notFound).send({ error: "Nicht gefunden." });
    reply.header("Cache-Control", SERVER.imageCacheControl);
    reply.header("X-Content-Type-Options", "nosniff");
    return reply.type(image.mimeType).send(image.buffer);
  });
  // Public discovery only. No unauthenticated profile, application or chat mutations.
  app.get(API_PATH.campaigns, async (request, reply) => {
    const parsed = z
      .object({ dealType: dealTypeSchema.optional() })
      .strict()
      .safeParse(request.query);
    if (!parsed.success)
      return reply
        .code(HTTP.badRequest)
        .send({ error: "Invalid campaign filter" });
    try {
      return campaignListSchema.parse({
        campaigns: await options.database.listCampaigns(parsed.data.dealType),
      });
    } catch {
      request.log.error("Campaign listing failed");
      return reply
        .code(HTTP.unavailable)
        .send({ error: "Campaigns are temporarily unavailable" });
    }
  });
}
