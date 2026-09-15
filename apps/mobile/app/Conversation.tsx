import { useLocalSearchParams } from 'expo-router';
import { ConversationView } from '../src/features/chat/ConversationView';
import { RoleGate } from '../src/ui/RoleGate';
export default function Conversation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <RoleGate>
      {(profile) => (
        <ConversationView key={id} id={id} role={profile.details.role} />
      )}
    </RoleGate>
  );
}
