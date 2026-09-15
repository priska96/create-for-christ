import { z } from 'zod';
import { campaignSnapshotSchema, pageQuerySchema } from './applications.js';
export const CHAT = {
  bodyLength: 4000,
  pageSize: 30,
  pollMs: 5000,
  listPollMs: 10000,
  requestsPerMinute: 30,
  bottomThreshold: 80,
} as const;
export const CHAT_PATH = {
  conversations: '/v1/conversations',
  conversation: '/v1/conversations/:id',
  messages: '/v1/conversations/:id/messages',
  read: '/v1/conversations/:id/read',
} as const;
export const CHAT_ERROR = {
  notFound: 'Gespräch nicht gefunden.',
  invalid: 'Bitte prüfe deine Nachricht.',
  conflict: 'Dieser Sendeversuch gehört bereits zu einer anderen Nachricht.',
} as const;
export function conversationPath(id: string, action?: 'messages' | 'read') {
  return (action ? CHAT_PATH[action] : CHAT_PATH.conversation).replace(
    ':id',
    encodeURIComponent(id)
  );
}
export const messageSequenceSchema = z
  .string()
  .regex(/^[1-9][0-9]{0,18}$/)
  .refine(
    (value) =>
      /^[1-9][0-9]{0,18}$/.test(value) && BigInt(value) <= 9223372036854775807n
  );
export const messageInputSchema = z
  .object({
    body: z
      .string()
      .trim()
      .min(1, 'Bitte eine Nachricht eingeben.')
      .max(
        CHAT.bodyLength,
        `Erlaubt sind höchstens ${CHAT.bodyLength} Zeichen.`
      ),
    clientId: z.uuid(),
  })
  .strict();
export const messageQuerySchema = z
  .object({ before: messageSequenceSchema.optional() })
  .strict();
export const messageReadSchema = z
  .object({ through: messageSequenceSchema })
  .strict();
export const chatMessageSchema = z.object({
  id: z.uuid(),
  sequence: messageSequenceSchema,
  clientId: z.uuid(),
  senderId: z.uuid(),
  body: z.string(),
  createdAt: z.string(),
});
export const conversationSchema = z.object({
  id: z.uuid(),
  selfId: z.uuid(),
  partnerName: z.string(),
  campaignTitle: z.string(),
  createdAt: z.string(),
  unreadCount: z.number().int().nonnegative(),
  lastMessage: chatMessageSchema.nullable(),
});
export const conversationDetailSchema = conversationSchema.extend({
  terms: campaignSnapshotSchema,
});
export const conversationListSchema = z.object({
  conversations: z.array(conversationSchema),
  nextCursor: z.string().nullable(),
});
export const messagePageSchema = z.object({
  messages: z.array(chatMessageSchema),
  nextCursor: messageSequenceSchema.nullable(),
});
export const conversationQuerySchema = pageQuerySchema;
export type MessageInput = z.infer<typeof messageInputSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type Conversation = z.infer<typeof conversationSchema>;
