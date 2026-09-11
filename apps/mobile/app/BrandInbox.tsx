import { ROLE } from '@create-for-christ/contracts';
import { ApplicationList } from '../src/features/applications/ApplicationList';
import { RoleGate } from '../src/ui/RoleGate';
export default function BrandInbox() {
  return (
    <RoleGate role={ROLE.brand}>
      <ApplicationList brandInbox />
    </RoleGate>
  );
}
