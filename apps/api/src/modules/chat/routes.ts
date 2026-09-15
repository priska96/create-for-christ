import {
  CHAT,
  CHAT_ERROR,
  CHAT_PATH,
  chatMessageSchema,
  conversationDetailSchema,
  conversationListSchema,
  conversationQuerySchema,
  messageInputSchema,
  messagePageSchema,
  messageQuerySchema,
  messageReadSchema,
} from '@create-for-christ/contracts';
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { SERVER } from '../../config/constants.js';
import type { SessionGuard } from '../../http/session.js';
import { parseInput } from '../../http/validation.js';
import type { ChatStore } from './store.js';
const params = z.object({ id: z.uuid() }).strict();
export function registerChatRoutes(
  app: FastifyInstance,
  store: ChatStore,
  session: SessionGuard
) {
  const id = (value: unknown) =>
    parseInput(params, value, CHAT_ERROR.invalid).id;
  app.get(CHAT_PATH.conversations, async (request) => {
    const user = await session(request);
    const query = parseInput(
      conversationQuerySchema,
      request.query,
      CHAT_ERROR.invalid
    );
    return conversationListSchema.parse(
      await store.list(user.user.id, query.cursor)
    );
  });
  app.get(CHAT_PATH.conversation, async (request) => {
    const user = await session(request);
    return conversationDetailSchema.parse(
      await store.detail(user.user.id, id(request.params))
    );
  });
  app.get(CHAT_PATH.messages, async (request) => {
    const user = await session(request);
    const query = parseInput(
      messageQuerySchema,
      request.query,
      CHAT_ERROR.invalid
    );
    return messagePageSchema.parse(
      await store.messages(user.user.id, id(request.params), query.before)
    );
  });
  app.post(
    CHAT_PATH.messages,
    {
      config: {
        rateLimit: {
          max: CHAT.requestsPerMinute,
          timeWindow: SERVER.rateWindow,
        },
      },
    },
    async (request) => {
      const user = await session(request);
      return chatMessageSchema.parse(
        await store.send(
          user.user.id,
          id(request.params),
          parseInput(messageInputSchema, request.body, CHAT_ERROR.invalid)
        )
      );
    }
  );
  app.post(CHAT_PATH.read, async (request) => {
    const user = await session(request);
    return store.read(
      user.user.id,
      id(request.params),
      parseInput(messageReadSchema, request.body, CHAT_ERROR.invalid).through
    );
  });
  app.addHook('onSend', async (request, reply, payload) => {
    if (request.url.startsWith(CHAT_PATH.conversations))
      reply.header('Cache-Control', 'no-store');
    return payload;
  });
}
