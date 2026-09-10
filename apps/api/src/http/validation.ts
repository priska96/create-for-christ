import { HTTP, MESSAGES } from '@create-for-christ/contracts';
import { z } from 'zod';
import { RequestError } from './errors.js';

export function parseInput<T>(
  schema: z.ZodType<T>,
  value: unknown,
  message: string
): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new RequestError(
      HTTP.badRequest,
      message,
      result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }))
    );
  return result.data;
}
const campaignParams = z.object({ id: z.uuid() });
export function campaignId(params: unknown) {
  return parseInput(campaignParams, params, MESSAGES.invalidCampaign).id;
}
