import { ROLE } from '@create-for-christ/contracts';
import { ApplicationList } from '../src/features/applications/ApplicationList';
import { RoleGate } from '../src/ui/RoleGate';
export default function MyApplications() {
  return (
    <RoleGate role={ROLE.creator}>
      <ApplicationList />
    </RoleGate>
  );
}
