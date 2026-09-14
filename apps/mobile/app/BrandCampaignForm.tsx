import { ROLE } from '@create-for-christ/contracts';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { useBrandCampaigns } from '../src/hooks/useCampaignQueries';
import { queryError } from '../src/query/client';
import { authClient } from '../src/authClient';
import { ROUTE } from '../src/constants';
import { CampaignForm } from '../src/features/campaigns/CampaignForm';
import { useMe } from '../src/hooks';
import { Action, Notice, Page, SignOutAction } from '../src/ui';

export default function BrandCampaignForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data: session, isPending } = authClient.useSession();
  const state = useMe(session?.user.id);
  const query = useBrandCampaigns(
    Boolean(id) && state.me?.profile?.details.role === ROLE.brand
  );
  const existing = id
    ? (query.data?.find((item) => item.id === id) ?? null)
    : null;
  const loading = Boolean(id) && query.isPending;
  const loadError = id
    ? queryError(query.error) ||
      (!loading && !existing ? 'Kampagne nicht gefunden.' : '')
    : '';
  if (isPending)
    return (
      <Page title="Kampagne">
        <ActivityIndicator />
      </Page>
    );
  if (!session) return <Redirect href={ROUTE.signIn} />;
  if (state.loading || loading)
    return (
      <Page title="Kampagne">
        <ActivityIndicator />
      </Page>
    );
  if (state.error)
    return (
      <Page title="Kampagnen">
        <Notice message={state.error} error />
        <Action onPress={state.retry}>Erneut versuchen</Action>
        <SignOutAction />
      </Page>
    );
  if (!state.me?.profile) return <Redirect href={ROUTE.profile} />;
  if (state.me.profile.details.role !== ROLE.brand)
    return <Redirect href={ROUTE.home} />;
  if (loadError)
    return (
      <Page title="Kampagne">
        <Notice message={loadError} error />
        <Action onPress={() => router.replace(ROUTE.brandCampaigns)}>
          Zurück zur Übersicht
        </Action>
      </Page>
    );

  return <CampaignForm key={id ?? 'new'} initial={existing} />;
}
