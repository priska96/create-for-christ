import { useMemo, useState, type ReactNode } from 'react';
import {
  Animated,
  PanResponder,
  Text,
  View,
  StyleSheet,
  type ViewProps,
} from 'react-native';
import { colors } from '../../ui/theme';
import { ui } from '../../ui';
import { createSwipeHandlers } from './swipeHandlers';
import { swipeTransform, resetSwipe } from './swipeAnimation';
import { styles } from './styles';
export function SwipeCard({
  children,
  underlay,
  disabled,
  onInterested,
  onDismiss,
  onDetails,
}: ViewProps & {
  underlay?: ReactNode;
  disabled: boolean;
  onInterested: () => void;
  onDismiss: () => void;
  onDetails: () => void;
}) {
  const [hintHeight, setHintHeight] = useState(0);
  const [offset] = useState(() => new Animated.ValueXY());
  const responder = useMemo(
    () => createResponder(offset, disabled, onInterested, onDismiss, onDetails),
    [disabled, offset, onInterested, onDismiss, onDetails]
  );
  return (
    <View style={deckStyles.deck} testID="campaign-deck">
      {underlay && (
        <View
          testID="next-campaign-card"
          pointerEvents="none"
          aria-hidden
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[deckStyles.underlay, { top: hintHeight }]}
        >
          {underlay}
        </View>
      )}
      <Animated.View
        testID="active-campaign-card"
        {...responder.panHandlers}
        style={[
          styles.swipeSurface,
          deckStyles.front,
          {
            transform: swipeTransform(offset),
          },
        ]}
      >
        <View
          onLayout={(event) => setHintHeight(event.nativeEvent.layout.height)}
        >
          <Text style={ui.body}>← Nicht interessiert · Bewerben →</Text>
          <Text style={ui.body}>↑ Infos ansehen</Text>
        </View>
        {children}
      </Animated.View>
    </View>
  );
}

function createResponder(
  offset: Animated.ValueXY,
  disabled: boolean,
  onInterested: () => void,
  onDismiss: () => void,
  onDetails: () => void
) {
  return PanResponder.create(
    createSwipeHandlers({
      disabled,
      move: (position) => offset.setValue(position),
      reset: () => resetSwipe(offset),
      onInterested,
      onDismiss,
      onDetails,
    })
  );
}

const deckStyles = StyleSheet.create({
  deck: { position: 'relative' },
  underlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  front: { backgroundColor: colors.background },
});
