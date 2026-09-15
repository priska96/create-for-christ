import {
  CHAT,
  messageInputSchema,
  type ProfileInput,
} from '@create-for-christ/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { randomUUID } from 'expo-crypto';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useForm } from 'react-hook-form';
import { ROUTE } from '../../constants';
import { FORM_OPTIONS } from '../../forms';
import {
  useChatActive,
  useConversation,
  useMessages,
  useReadConversation,
  useSendMessage,
} from '../../hooks/useChatQueries';
import { queryError } from '../../query/client';
import { Action, DetailSheet, FormField, Notice, Page, ui } from '../../ui';
import { CampaignBrief } from '../applications/CampaignBrief';
import { styles } from './styles';
export function ConversationView({
  id,
  role,
}: {
  id: string;
  role: ProfileInput['role'];
}) {
  const active = useChatActive(),
    detail = useConversation(id, active),
    query = useMessages(id, active && Boolean(detail.data));
  const send = useSendMessage(),
    read = useReadConversation();
  const [terms, setTerms] = useState(false),
    [atBottom, setAtBottom] = useState(true);
  const scroll = useRef<ScrollView>(null),
    nearBottom = useRef(true),
    readThrough = useRef<string | null>(null);
  const attempt = useRef<{ body: string; clientId: string } | null>(null);
  const { control, handleSubmit, reset } = useForm({
    ...FORM_OPTIONS,
    // A cleared composer is valid until the next send attempt, even after blur.
    mode: 'onSubmit',
    resolver: zodResolver(messageInputSchema.pick({ body: true })),
    defaultValues: { body: '' },
  });
  const messages = [
    ...new Map(
      (query.data?.pages.flatMap((page) => page.messages) ?? []).map(
        (message) => [message.id, message]
      )
    ).values(),
  ].reverse();
  const latest = query.data?.pages[0]?.messages[0]?.sequence;
  const { mutate: markRead } = read;
  useEffect(() => {
    if (active && atBottom && latest && readThrough.current !== latest) {
      readThrough.current = latest;
      markRead(
        { id, through: latest },
        {
          onError: () => {
            readThrough.current = null;
          },
        }
      );
    }
  }, [active, atBottom, latest, id, markRead]);
  function submit({ body }: { body: string }) {
    if (send.isPending) return;
    if (attempt.current?.body !== body)
      attempt.current = { body, clientId: randomUUID() };
    send.mutate(
      { id, input: attempt.current },
      {
        onSuccess: () => {
          attempt.current = null;
          reset();
          nearBottom.current = true;
          setAtBottom(true);
        },
      }
    );
  }
  return (
    <Page
      title={detail.data?.partnerName ?? 'Gespräch'}
      subtitle={detail.data?.campaignTitle}
      navigationRole={role}
      onBack={() => router.replace(ROUTE.messages)}
      scrollRef={scroll}
      scrollProps={{
        onContentSizeChange: () => {
          if (nearBottom.current)
            scroll.current?.scrollToEnd({ animated: false });
        },
        onScroll: (event) => {
          const { contentOffset, layoutMeasurement, contentSize } =
            event.nativeEvent;
          const bottom =
            contentOffset.y + layoutMeasurement.height >=
            contentSize.height - CHAT.bottomThreshold;
          nearBottom.current = bottom;
          setAtBottom(bottom);
        },
      }}
      footer={
        detail.data && (
          <View style={styles.composer}>
            <Notice error message={queryError(send.error)} />
            <FormField
              control={control}
              name="body"
              label="Nachricht"
              multiline
              maxLength={CHAT.bodyLength}
              editable={!send.isPending}
            />
            <Action
              busy={send.isPending}
              onPress={() => void handleSubmit(submit)()}
            >
              Nachricht senden
            </Action>
          </View>
        )
      }
    >
      <Notice
        error
        message={queryError(detail.error || query.error || read.error)}
      />
      {(detail.isError || query.isError) && (
        <Action
          onPress={() => {
            void detail.refetch();
            void query.refetch();
          }}
        >
          Erneut versuchen
        </Action>
      )}
      {(detail.isPending || (detail.data && query.isPending)) && (
        <ActivityIndicator />
      )}
      {detail.data && (
        <Action secondary onPress={() => setTerms(true)}>
          Vereinbarte Bedingungen
        </Action>
      )}
      {query.hasNextPage && (
        <Action
          busy={query.isFetchingNextPage}
          onPress={() => {
            nearBottom.current = false;
            setAtBottom(false);
            void query.fetchNextPage();
          }}
        >
          Ältere Nachrichten laden
        </Action>
      )}
      {messages.map((message) => (
        <View
          key={message.id}
          style={[
            styles.bubble,
            message.senderId === detail.data?.selfId && styles.own,
          ]}
        >
          <Text style={ui.label}>
            {message.senderId === detail.data?.selfId
              ? 'Du'
              : detail.data?.partnerName}
          </Text>
          <Text selectable style={ui.body}>
            {message.body}
          </Text>
          <Text style={ui.body}>
            {new Date(message.createdAt).toLocaleString('de-DE')}
          </Text>
        </View>
      ))}
      {terms && detail.data && (
        <DetailSheet
          title="Vereinbarte Bedingungen"
          onClose={() => setTerms(false)}
        >
          <CampaignBrief campaign={detail.data.terms} />
        </DetailSheet>
      )}
    </Page>
  );
}
