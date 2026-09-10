import { HTTP, MESSAGES } from "@create-for-christ/contracts";
import type { FastifyInstance } from "fastify";
import {
  CampaignForbidden,
  CampaignNotFound,
  CampaignStateError,
} from "../modules/campaigns/store.js";
import { ProfileConflict } from "../modules/profiles/store.js";
export class RequestError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public issues?: { path: string; message: string }[],
  ) {
    super(message);
  }
}
export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof RequestError)
      return reply.code(error.statusCode).send({
        error: error.message,
        ...(error.issues ? { issues: error.issues } : {}),
      });
    if (error instanceof ProfileConflict || error instanceof CampaignStateError)
      return reply.code(HTTP.conflict).send({ error: error.message });
    if (error instanceof CampaignForbidden)
      return reply.code(HTTP.forbidden).send({ error: error.message });
    if (error instanceof CampaignNotFound)
      return reply.code(HTTP.notFound).send({ error: error.message });
    const status =
      error instanceof Error &&
      "statusCode" in error &&
      typeof error.statusCode === "number"
        ? error.statusCode
        : HTTP.internalError;
    request.log.error({ err: error }, "Request failed");
    return reply
      .code(
        status >= HTTP.badRequest && status < HTTP.internalError
          ? status
          : HTTP.internalError,
      )
      .send({ error: MESSAGES.requestFailed });
  });
}
