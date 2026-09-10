import {
  API_PATH,
  campaignDetailListSchema,
  campaignDetailSchema,
  campaignImageInputSchema,
  campaignInputSchema,
  HTTP,
  IMAGE,
  MESSAGES,
} from "@create-for-christ/contracts";
import type { FastifyInstance } from "fastify";
import { SERVER } from "../../config/constants.js";
import { RequestError } from "../../http/errors.js";
import type { SessionGuard } from "../../http/session.js";
import { campaignId, parseInput } from "../../http/validation.js";
import {
  deleteCampaignImage,
  InvalidCampaignImage,
  saveCampaignImage,
} from "./images.js";
import type { CampaignStore } from "./store.js";
export function registerCampaignRoutes(
  app: FastifyInstance,
  campaigns: CampaignStore,
  requireSession: SessionGuard,
) {
  app.get(API_PATH.brandCampaigns, async (request) => {
    const session = await requireSession(request, true);
    return campaignDetailListSchema.parse({
      campaigns: await campaigns.listOwn(session.user.id),
    });
  });
  app.post(API_PATH.brandCampaigns, async (request) => {
    const session = await requireSession(request, true);
    return campaignDetailSchema.parse(
      await campaigns.create(
        session.user.id,
        parseInput(campaignInputSchema, request.body, MESSAGES.campaignInput),
      ),
    );
  });
  app.put(API_PATH.campaign, async (request) => {
    const session = await requireSession(request, true);
    return campaignDetailSchema.parse(
      await campaigns.update(
        session.user.id,
        campaignId(request.params),
        parseInput(campaignInputSchema, request.body, MESSAGES.campaignInput),
      ),
    );
  });
  for (const [path, transition] of [
    [API_PATH.publishCampaign, campaigns.publish],
    [API_PATH.closeCampaign, campaigns.close],
  ] as const) {
    app.post(path, async (request) => {
      const session = await requireSession(request, true);
      return campaignDetailSchema.parse(
        await transition(session.user.id, campaignId(request.params)),
      );
    });
  }
  app.post(
    API_PATH.campaignImage,
    {
      bodyLimit: IMAGE.jsonBodyLimit,
      config: {
        rateLimit: {
          max: SERVER.uploadRequestsPerMinute,
          timeWindow: SERVER.rateWindow,
        },
      },
    },
    async (request) => {
      const session = await requireSession(request, true);
      const id = campaignId(request.params);
      const input = parseInput(
        campaignImageInputSchema,
        request.body,
        MESSAGES.selectImage,
      );
      const buffer = Buffer.from(input.data, "base64");
      if (buffer.byteLength > IMAGE.maxBytes)
        throw new RequestError(HTTP.payloadTooLarge, MESSAGES.imageTooLarge);
      let savedUrl: string | undefined;
      try {
        return campaignDetailSchema.parse(
          await campaigns.setProductImage(session.user.id, id, async () => {
            savedUrl = await saveCampaignImage(buffer);
            return savedUrl;
          }),
        );
      } catch (error) {
        if (savedUrl) await deleteCampaignImage(savedUrl);
        if (error instanceof InvalidCampaignImage)
          throw new RequestError(HTTP.badRequest, error.message);
        throw error;
      }
    },
  );
}
