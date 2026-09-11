import { useMemo, useState } from 'react';
import { Animated, PanResponder, Text, type ViewProps } from 'react-native';
import { ui } from '../../ui';
import { SWIPE } from './constants';
import { styles } from './styles';
export function SwipeCard({
  children,
  disabled,
  onInterested,
  onDismiss,
}: ViewProps & {
  disabled: boolean;
  onInterested: () => void;
  onDismiss: () => void;
}) {
  const [offset] = useState(() => new Animated.Value(0));
  const responder = useMemo(() => {
    const reset = () =>
      Animated.timing(offset, {
        toValue: 0,
        duration: SWIPE.resetDurationMs,
        useNativeDriver: true,
      }).start();
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        !disabled &&
        Math.abs(gesture.dx) > SWIPE.startDistance &&
        Math.abs(gesture.dx) > Math.abs(gesture.dy) * SWIPE.horizontalRatio,
      onPanResponderMove: (_, gesture) => {
        if (!disabled) offset.setValue(gesture.dx);
      },
      onPanResponderRelease: (_, gesture) => {
        reset();
        if (disabled) return;
        if (gesture.dx >= SWIPE.threshold) onInterested();
        else if (gesture.dx <= -SWIPE.threshold) onDismiss();
      },
      onPanResponderTerminate: reset,
    });
  }, [disabled, offset, onInterested, onDismiss]);
  return (
    <Animated.View
      {...responder.panHandlers}
      style={[
        styles.swipeSurface,
        {
          transform: [
            { translateX: offset },
            {
              rotate: offset.interpolate({
                inputRange: [-SWIPE.threshold, SWIPE.threshold],
                outputRange: [
                  `-${SWIPE.rotationDegrees}deg`,
                  `${SWIPE.rotationDegrees}deg`,
                ],
                extrapolate: 'clamp',
              }),
            },
          ],
        },
      ]}
    >
      <Text style={ui.body}>← Nicht interessiert · Bewerben →</Text>
      {children}
    </Animated.View>
  );
}
