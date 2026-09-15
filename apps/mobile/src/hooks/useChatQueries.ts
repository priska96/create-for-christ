import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback, useState, useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { CHAT } from '@create-for-christ/contracts';
import {
  getConversation,
  getConversations,
  getMessages,
  readConversation,
  sendMessage,
} from '../api/chat';
import { queryKeys } from '../query/client';
function subscribe(listener: () => void) {
  if (Platform.OS === 'web') {
    document.addEventListener('visibilitychange', listener);
    return () => document.removeEventListener('visibilitychange', listener);
  }
  const subscription = AppState.addEventListener('change', listener);
  return () => subscription.remove();
}
const foreground = () =>
  Platform.OS === 'web'
    ? document.visibilityState === 'visible'
    : AppState.currentState === 'active';
export function useChatActive() {
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, [])
  );
  const active = useSyncExternalStore(subscribe, foreground, () => false);
  return focused && active;
}
export function useConversations(active: boolean) {
  return useInfiniteQuery({
    queryKey: queryKeys.conversations,
    queryFn: ({ pageParam, signal }) => getConversations(pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: active,
    staleTime: 0,
    refetchInterval: active ? CHAT.listPollMs : false,
  });
}
export function useConversation(id: string, active: boolean) {
  return useQuery({
    queryKey: [...queryKeys.conversations, id],
    queryFn: ({ signal }) => getConversation(id, signal),
    enabled: active,
    staleTime: 0,
  });
}
export function useMessages(id: string, active: boolean) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.messages, id],
    queryFn: ({ pageParam, signal }) => getMessages(id, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: active,
    staleTime: 0,
    refetchInterval: active ? CHAT.pollMs : false,
  });
}
export function useSendMessage() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: sendMessage,
    onSuccess: (_message, { id }) => {
      void client.invalidateQueries({ queryKey: [...queryKeys.messages, id] });
      void client.invalidateQueries({ queryKey: queryKeys.conversations });
    },
  });
}
export function useReadConversation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: readConversation,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.conversations });
    },
  });
}
