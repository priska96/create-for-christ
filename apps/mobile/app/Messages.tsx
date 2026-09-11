import { EmptyState, Page } from '../src/ui';
import { RoleGate } from '../src/ui/RoleGate';
export default function Messages() {
  return (
    <RoleGate>
      {(profile) => (
        <Page title="Nachrichten" navigationRole={profile.details.role}>
          <EmptyState
            icon="chatbubbles-outline"
            title="Raum für Verbindung."
            description="Hier findest du künftig eure Gespräche. Der Chat ist noch nicht verfügbar. Deine Zusagen findest du unter Bewerbungen."
          />
        </Page>
      )}
    </RoleGate>
  );
}
