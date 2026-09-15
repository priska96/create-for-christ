import { router } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import type { ProfileInput } from '@create-for-christ/contracts';
import { ROUTE } from '../../constants';
import { useChatActive, useConversations } from '../../hooks/useChatQueries';
import { queryError } from '../../query/client';
import { Action, Avatar, EmptyState, Notice, Page, ui } from '../../ui';
import { styles } from './styles';
export function ConversationList({ role }: { role: ProfileInput['role'] }) {
  const active = useChatActive(),
    query = useConversations(active);
  const conversations =
    query.data?.pages.flatMap((page) => page.conversations) ?? [];
  return (
    <Page title="Nachrichten" navigationRole={role}>
      <Notice error message={queryError(query.error)} />
      {query.isError && (
        <Action onPress={() => void query.refetch()}>Erneut versuchen</Action>
      )}
      {query.isPending && <ActivityIndicator />}
      {!query.isPending && !query.isError && !conversations.length && (
        <EmptyState
          icon="chatbubbles-outline"
          title="Raum für Verbindung."
          description="Sobald eine Brand deine Bewerbung annimmt, könnt ihr hier miteinander schreiben."
        />
      )}
      {conversations.map((conversation) => (
        <Pressable
          key={conversation.id}
          accessibilityRole="button"
          accessibilityLabel={`Gespräch öffnen: ${conversation.partnerName} · ${conversation.campaignTitle}`}
          style={styles.row}
          onPress={() =>
            router.push({
              pathname: ROUTE.conversation,
              params: { id: conversation.id },
            })
          }
        >
          <Avatar name={conversation.partnerName} />
          <View style={styles.text}>
            <Text style={ui.label}>{conversation.partnerName}</Text>
            <Text style={ui.body}>{conversation.campaignTitle}</Text>
            <Text numberOfLines={2} style={ui.body}>
              {conversation.lastMessage?.body ?? 'Euer Match – sagt Hallo!'}
            </Text>
          </View>
          {conversation.unreadCount > 0 && (
            <Text
              accessibilityLabel={`${conversation.unreadCount} ungelesene Nachrichten`}
              style={styles.unread}
            >
              {conversation.unreadCount}
            </Text>
          )}
        </Pressable>
      ))}
      {query.hasNextPage && (
        <Action
          busy={query.isFetchingNextPage}
          onPress={() => void query.fetchNextPage()}
        >
          Weitere Gespräche laden
        </Action>
      )}
    </Page>
  );
}
