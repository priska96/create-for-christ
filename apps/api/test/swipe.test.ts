import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createSwipeHandlers,
  detailSwipeAction,
} from '../../mobile/src/features/applications/swipeHandlers.js';
function setup(disabled = false) {
  const actions: string[] = [];
  const handlers = createSwipeHandlers({
    disabled,
    move: () => {},
    reset: () => actions.push('reset'),
    onDetails: () => actions.push('details'),
    onInterested: () => actions.push('apply'),
    onDismiss: () => actions.push('dismiss'),
  });
  return { handlers, actions };
}
test('card claims native touch before scrolling and retains responder ownership', () => {
  const { handlers } = setup();
  assert.equal(handlers.onStartShouldSetPanResponder(), true);
  assert.equal(handlers.onPanResponderTerminationRequest(), false);
  assert.equal(handlers.onShouldBlockNativeResponder(), true);
  assert.equal(setup(true).handlers.onStartShouldSetPanResponder(), false);
});
test('up opens details; horizontal gestures preserve application actions', () => {
  for (const [dx, dy, expected] of [
    [0, -120, 'details'],
    [120, 0, 'apply'],
    [-120, 0, 'dismiss'],
  ] as const) {
    const { handlers, actions } = setup();
    handlers.onPanResponderGrant();
    handlers.onPanResponderMove(null, { dx, dy });
    handlers.onPanResponderRelease(null, { dx, dy });
    assert.deepEqual(actions, ['reset', expected]);
  }
});
test('short, downward, diagonal, cancelled and disabled gestures never act', () => {
  for (const [dx, dy] of [
    [0, -30],
    [0, 120],
    [100, -100],
  ] as const) {
    const { handlers, actions } = setup();
    handlers.onPanResponderMove(null, { dx, dy });
    handlers.onPanResponderRelease(null, { dx, dy });
    assert.deepEqual(actions, ['reset']);
  }
  for (const disabled of [false, true]) {
    const { handlers, actions } = setup(disabled);
    handlers.onPanResponderMove(null, { dx: 0, dy: -120 });
    handlers.onPanResponderTerminate();
    handlers.onPanResponderRelease(null, { dx: 0, dy: -120 });
    assert.deepEqual(actions, ['reset', 'reset']);
  }
});

test('detail gestures apply or dismiss; pull down only closes from the top', () => {
  assert.equal(detailSwipeAction(120, 10, 250), 'apply');
  assert.equal(detailSwipeAction(-120, 10, 250), 'dismiss');
  assert.equal(detailSwipeAction(0, 120, 0), 'close');
  assert.equal(detailSwipeAction(0, 120, -10), 'close');
  assert.equal(detailSwipeAction(0, 120, 200), null);
  assert.equal(detailSwipeAction(0, -120, 0), null);
  assert.equal(detailSwipeAction(10, 20, 0), null);
  assert.equal(detailSwipeAction(120, 120, 0), null);
});
