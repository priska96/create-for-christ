import type { ComponentProps, ReactNode } from 'react';
import { Animated } from 'react-native';
import { ui } from './styles';
import { AppModal } from './AppModal';
import { IconButton } from './IconButton';
import { Page } from './Page';
export function DetailSheet({
  title,
  onClose,
  children,
  busy = false,
  fullScreenContent,
  scrollProps,
  animatedStyle,
  transparent = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  busy?: boolean;
  transparent?: boolean;
  animatedStyle?: ComponentProps<typeof Animated.View>['style'];
  fullScreenContent?: ReactNode;
  scrollProps?: ComponentProps<typeof Page>['scrollProps'];
}) {
  return (
    <AppModal
      visible
      transparent={transparent}
      animationType="slide"
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <Animated.View
        testID="detail-sheet-surface"
        style={[ui.fill, animatedStyle]}
      >
        {fullScreenContent ?? (
          <Page
            title={title}
            scrollProps={scrollProps}
            headerAction={
              <IconButton
                icon="close"
                label="Schließen"
                disabled={busy}
                onPress={onClose}
              />
            }
          >
            {children}
          </Page>
        )}
      </Animated.View>
    </AppModal>
  );
}
