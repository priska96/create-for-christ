import {
  MESSAGES,
  ROLE,
  type CampaignDetail,
} from '@create-for-christ/contracts';
import {
  Redirect,
  router,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { ApiError, getBrandCampaigns } from '../src/api';
import { authClient } from '../src/auth-client';
import { ROUTE } from '../src/constants';
import { CampaignForm } from '../src/features/campaigns/CampaignForm';
import { Action, Notice, Page, SignOutAction } from '../src/ui';
import { useMe } from '../src/use-me';

export default function BrandCampaignForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data: session, isPending } = authClient.useSession();
  const state = useMe(session?.user.id);
  const [existing, setExisting] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [loadError, setLoadError] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (!id || !session) {
        setLoading(false);
        return;
      }
      let active = true;
      const controller = new AbortController();
      setLoading(true);
      setLoadError('');
      getBrandCampaigns(controller.signal)
        .then((list) => {
          if (!active) return;
          const found = list.find((item) => item.id === id);
          if (!found) {
            setLoadError('Kampagne nicht gefunden.');
            return;
          }
          setExisting(found);
        })
        .catch((cause) => {
          if (active)
            setLoadError(
              cause instanceof ApiError ? cause.message : MESSAGES.connection
            );
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
        controller.abort();
      };
    }, [id, session?.user.id])
  );

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
