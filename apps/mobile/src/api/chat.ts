import {
  CHAT_PATH,
  chatMessageSchema,
  conversationDetailSchema,
  conversationListSchema,
  conversationPath,
  messagePageSchema,
  type MessageInput,
} from '@create-for-christ/contracts';
import { authenticatedRequest } from './request';
export async function getConversations(cursor?: string, signal?: AbortSignal) {
  return conversationListSchema.parse(
    await authenticatedRequest(
      CHAT_PATH.conversations +
        (cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''),
      'GET',
      undefined,
      signal
    )
  );
}
export async function getConversation(id: string, signal?: AbortSignal) {
  return conversationDetailSchema.parse(
    await authenticatedRequest(conversationPath(id), 'GET', undefined, signal)
  );
}
export async function getMessages(
  id: string,
  before?: string,
  signal?: AbortSignal
) {
  return messagePageSchema.parse(
    await authenticatedRequest(
      conversationPath(id, 'messages') +
        (before ? `?before=${encodeURIComponent(before)}` : ''),
      'GET',
      undefined,
      signal
    )
  );
}
export async function sendMessage({
  id,
  input,
}: {
  id: string;
  input: MessageInput;
}) {
  return chatMessageSchema.parse(
    await authenticatedRequest(conversationPath(id, 'messages'), 'POST', input)
  );
}
export function readConversation({
  id,
  through,
}: {
  id: string;
  through: string;
}) {
  return authenticatedRequest(conversationPath(id, 'read'), 'POST', {
    through,
  });
}
