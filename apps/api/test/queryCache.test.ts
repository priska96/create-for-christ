import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapPages, type ItemPages } from '../../mobile/src/query/cache.js';

test('infinite cache updates preserve page cursors and never mutate snapshots', () => {
  const original: ItemPages<{ id: string }> = {
    pages: [
      { items: [{ id: 'applied' }, { id: 'next' }], nextCursor: 'cursor' },
      { items: [{ id: 'later' }], nextCursor: null },
    ],
    pageParams: [undefined, 'cursor'],
  };
  const updated = mapPages(original, (items) =>
    items.filter((item) => item.id !== 'applied')
  );
  assert.deepEqual(
    updated?.pages.map((page) => page.items),
    [[{ id: 'next' }], [{ id: 'later' }]]
  );
  assert.deepEqual(updated?.pageParams, original.pageParams);
  assert.equal(updated?.pages[0]?.nextCursor, 'cursor');
  assert.equal(original.pages[0]?.items.length, 2);
  assert.equal(
    mapPages(undefined, () => []),
    undefined
  );
});

test('decision updates remove entries from incompatible filters without changing other applications', () => {
  const original: ItemPages<{ id: string; status: string }> = {
    pages: [
      {
        items: [
          { id: 'chosen', status: 'pending' },
          { id: 'untouched', status: 'pending' },
        ],
        nextCursor: null,
      },
    ],
    pageParams: [undefined],
  };
  const updated = mapPages(original, (items) =>
    items
      .map((item) =>
        item.id === 'chosen' ? { ...item, status: 'accepted' } : item
      )
      .filter((item) => item.status === 'pending')
  );
  assert.deepEqual(updated?.pages[0]?.items, [
    { id: 'untouched', status: 'pending' },
  ]);
  assert.equal(original.pages[0]?.items[0]?.status, 'pending');
});
