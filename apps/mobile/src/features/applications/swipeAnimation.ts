import { Animated } from 'react-native';
import { SWIPE } from './swipeHandlers';
export function swipeTransform(offset: Animated.ValueXY) {
  return [
    { translateX: offset.x },
    { translateY: offset.y },
    {
      rotate: offset.x.interpolate({
        inputRange: [-SWIPE.threshold, SWIPE.threshold],
        outputRange: [
          `-${SWIPE.rotationDegrees}deg`,
          `${SWIPE.rotationDegrees}deg`,
        ],
        extrapolate: 'clamp',
      }),
    },
  ];
}
export function resetSwipe(offset: Animated.ValueXY) {
  Animated.timing(offset, {
    toValue: { x: 0, y: 0 },
    duration: SWIPE.resetDurationMs,
    useNativeDriver: true,
  }).start();
}
