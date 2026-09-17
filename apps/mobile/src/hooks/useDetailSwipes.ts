import { useRef, useState } from 'react';
import { Animated, type ScrollViewProps } from 'react-native';
import {
  swipeTransform,
  resetSwipe,
} from '../features/applications/swipeAnimation';
import {
  SWIPE,
  detailSwipeAction,
} from '../features/applications/swipeHandlers';
export function useDetailSwipes({
  disabled,
  onInterested,
  onDismiss,
  onClose,
}: {
  disabled: boolean;
  onInterested: () => void;
  onDismiss: () => void;
  onClose: () => void;
}) {
  const [offset] = useState(() => new Animated.ValueXY());
  const scrollY = useRef(0);
  const start = useRef<{ x: number; y: number; scrollY: number } | null>(null);
  const scrollProps: Pick<
    ScrollViewProps,
    'onScroll' | 'onTouchStart' | 'onTouchMove' | 'onTouchEnd' | 'onTouchCancel'
  > = {
    onScroll: (event) => {
      scrollY.current = event.nativeEvent.contentOffset.y;
    },
    onTouchStart: (event) => {
      offset.stopAnimation();
      offset.setValue({ x: 0, y: 0 });
      const { touches } = event.nativeEvent;
      const touch = touches[0];
      start.current =
        !disabled && touches.length === 1 && touch
          ? { x: touch.pageX, y: touch.pageY, scrollY: scrollY.current }
          : null;
    },
    onTouchMove: (event) => {
      const origin = start.current;
      const touch = event.nativeEvent.touches[0];
      if (!origin || !touch || disabled) return;
      if (event.nativeEvent.touches.length !== 1) {
        start.current = null;
        resetSwipe(offset);
        return;
      }
      const dx = touch.pageX - origin.x,
        dy = touch.pageY - origin.y;
      offset.setValue({
        x:
          Math.abs(dx) > SWIPE.startDistance &&
          Math.abs(dx) > Math.abs(dy) * SWIPE.horizontalRatio
            ? dx
            : 0,
        y: 0,
      });
    },
    onTouchCancel: () => {
      resetSwipe(offset);
      start.current = null;
    },
    onTouchEnd: (event) => {
      resetSwipe(offset);
      const origin = start.current;
      const touch = event.nativeEvent.changedTouches[0];
      start.current = null;
      if (!origin || !touch || disabled) return;
      const action = detailSwipeAction(
        touch.pageX - origin.x,
        touch.pageY - origin.y,
        origin.scrollY
      );
      if (action === 'apply') onInterested();
      else if (action === 'dismiss') onDismiss();
      else if (action === 'close') onClose();
    },
  };
  return { scrollProps, animatedStyle: { transform: swipeTransform(offset) } };
}
