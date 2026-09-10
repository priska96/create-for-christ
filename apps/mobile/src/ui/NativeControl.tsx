import { Host } from '@expo/ui';
import type { ReactNode } from 'react';
import { colors } from './theme';

export function NativeControl({ children }: { children: ReactNode }) {
  return (
    <Host
      matchContents={{ vertical: true }}
      colorScheme="light"
      seedColor={colors.primary}
      style={{ width: '100%' }}
    >
      {children}
    </Host>
  );
}
