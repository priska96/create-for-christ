import { ROLE } from '@create-for-christ/contracts';
import { router, useLocalSearchParams } from 'expo-router';
import { z } from 'zod';
import { ROUTE } from '../src/constants';
import { ApplicationList } from '../src/features/applications/ApplicationList';
import { Action, Notice, Page } from '../src/ui';
import { RoleGate } from '../src/ui/RoleGate';
export default function BrandApplications() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success)
    return (
      <Page title="Bewerbungen">
        <Notice error message="Ungültige Kampagne." />
        <Action onPress={() => router.replace(ROUTE.brandCampaigns)}>
          Zu meinen Kampagnen
        </Action>
      </Page>
    );
  return (
    <RoleGate role={ROLE.brand}>
      <ApplicationList key={parsed.data} campaignId={parsed.data} />
    </RoleGate>
  );
}
