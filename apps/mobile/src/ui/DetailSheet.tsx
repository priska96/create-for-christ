import type { ReactNode } from 'react';
import { AppModal } from './AppModal';
import { IconButton } from './IconButton';
import { Page } from './Page';
export function DetailSheet({
  title,
  onClose,
  children,
  busy = false,
  fullScreenContent,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  busy?: boolean;
  fullScreenContent?: ReactNode;
}) {
  return (
    <AppModal
      visible
      animationType="slide"
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      {fullScreenContent ?? (
        <Page
          title={title}
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
    </AppModal>
  );
}
