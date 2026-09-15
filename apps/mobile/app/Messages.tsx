import { ConversationList } from '../src/features/chat/ConversationList';
import { RoleGate } from '../src/ui/RoleGate';
export default function Messages() {
  return (
    <RoleGate>
      {(profile) => <ConversationList role={profile.details.role} />}
    </RoleGate>
  );
}
