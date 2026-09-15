import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import {
  CHAT,
  messageInputSchema,
  messageQuerySchema,
  messageReadSchema,
} from '@create-for-christ/contracts';
test('chat validates input and treats bigint cursors as bounded strings', () => {
  assert.equal(
    messageInputSchema.parse({ body: ' Hallo ', clientId: randomUUID() }).body,
    'Hallo'
  );
  assert.equal(
    messageInputSchema.safeParse({
      body: 'x'.repeat(CHAT.bodyLength),
      clientId: randomUUID(),
    }).success,
    true
  );
  for (const before of ['0', '-1', 'text', '1.2', '9223372036854775808'])
    assert.equal(messageQuerySchema.safeParse({ before }).success, false);
  assert.equal(
    messageReadSchema.safeParse({ through: '9223372036854775807' }).success,
    true
  );
  assert.equal(
    messageInputSchema.safeParse({ body: ' ', clientId: randomUUID() }).success,
    false
  );
});
