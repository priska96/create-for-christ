export const SWIPE = {
  startDistance: 12,
  threshold: 90,
  horizontalRatio: 1.5,
  resetDurationMs: 180,
  rotationDegrees: 8,
} as const;

type Movement = { dx: number; dy: number };
export function createSwipeHandlers({
  disabled,
  move,
  reset,
  onInterested,
  onDismiss,
  onDetails,
}: {
  disabled: boolean;
  move: (position: { x: number; y: number }) => void;
  reset: () => void;
  onInterested: () => void;
  onDismiss: () => void;
  onDetails: () => void;
}) {
  let axis: 'horizontal' | 'vertical' | null = null;
  return {
    // Claim the card on touch-down, before the native ScrollView starts scrolling.
    onStartShouldSetPanResponder: () => !disabled,
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
    onPanResponderGrant: () => {
      axis = null;
    },
    onPanResponderMove: (_: unknown, gesture: Movement) => {
      if (disabled) return;
      if (!axis) {
        if (
          Math.abs(gesture.dx) > SWIPE.startDistance &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * SWIPE.horizontalRatio
        )
          axis = 'horizontal';
        else if (
          -gesture.dy > SWIPE.startDistance &&
          -gesture.dy > Math.abs(gesture.dx) * SWIPE.horizontalRatio
        )
          axis = 'vertical';
      }
      if (axis)
        move(
          axis === 'vertical'
            ? { x: 0, y: Math.min(0, gesture.dy) }
            : { x: gesture.dx, y: 0 }
        );
    },
    onPanResponderRelease: (_: unknown, gesture: Movement) => {
      reset();
      if (disabled) return;
      if (axis === 'vertical') {
        if (-gesture.dy >= SWIPE.threshold) onDetails();
      } else if (axis === 'horizontal') {
        if (gesture.dx >= SWIPE.threshold) onInterested();
        else if (gesture.dx <= -SWIPE.threshold) onDismiss();
      }
      axis = null;
    },
    onPanResponderTerminate: () => {
      axis = null;
      reset();
    },
  };
}

// Detail pages retain native vertical scrolling; closing is only allowed at the top.
export function detailSwipeAction(dx: number, dy: number, scrollY: number) {
  if (
    Math.abs(dx) >= SWIPE.threshold &&
    Math.abs(dx) > Math.abs(dy) * SWIPE.horizontalRatio
  )
    return dx > 0 ? 'apply' : 'dismiss';
  if (
    scrollY <= 0 &&
    dy >= SWIPE.threshold &&
    dy > Math.abs(dx) * SWIPE.horizontalRatio
  )
    return 'close';
  return null;
}
