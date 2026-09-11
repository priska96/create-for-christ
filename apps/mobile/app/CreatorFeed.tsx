import { ROLE } from '@create-for-christ/contracts';
import { CreatorFeed } from '../src/features/applications/CreatorFeed';
import { RoleGate } from '../src/ui/RoleGate';

export default function CreatorFeedScreen() {
  return (
    <RoleGate role={ROLE.creator}>
      <CreatorFeed />
    </RoleGate>
  );
}
