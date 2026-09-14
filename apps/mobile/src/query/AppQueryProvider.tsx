import {
  QueryClientProvider,
  focusManager,
  onlineManager,
} from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import * as Network from 'expo-network';
import { authClient } from '../authClient';
import { createQueryClient } from './client';
function QueryScope({ children }: { children: ReactNode }) {
  const [client] = useState(createQueryClient);
  useEffect(
    () => () => {
      void client.cancelQueries();
      client.clear();
    },
    [client]
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
export function AppQueryProvider({ children }: { children: ReactNode }) {
  const { data: session } = authClient.useSession();
  useEffect(() => {
    if (Platform.OS === 'web') return;
    focusManager.setEventListener((setFocused) => {
      setFocused(AppState.currentState === 'active');
      const subscription = AppState.addEventListener('change', (state) =>
        setFocused(state === 'active')
      );
      return () => subscription.remove();
    });
    onlineManager.setEventListener((setOnline) => {
      let active = true;
      const update = (state: Network.NetworkState) =>
        setOnline(
          state.isConnected !== false && state.isInternetReachable !== false
        );
      const subscription = Network.addNetworkStateListener(update);
      void Network.getNetworkStateAsync()
        .then((state) => {
          if (active) update(state);
        })
        .catch(() => {});
      return () => {
        active = false;
        subscription.remove();
      };
    });
    return () => {
      focusManager.setEventListener(() => () => {});
      onlineManager.setEventListener(() => () => {});
    };
  }, []);
  // Separate clients prevent requests from a previous account from repopulating the current cache.
  return (
    <QueryScope key={session?.user.id ?? 'anonymous'}>{children}</QueryScope>
  );
}
