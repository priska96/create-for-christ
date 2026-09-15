import type { ComponentProps } from 'react';
import { Modal } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Native modals have their own window and must measure their own safe area.
export function AppModal({ children, ...props }: ComponentProps<typeof Modal>) {
  return (
    <Modal animationType="slide" {...props}>
      <SafeAreaProvider>{children}</SafeAreaProvider>
    </Modal>
  );
}
