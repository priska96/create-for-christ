import type { CampaignDetail } from '@create-for-christ/contracts';
import {
  CAMPAIGN_STATUS,
  DEAL,
  MESSAGES,
  ROLE,
} from '@create-for-christ/contracts';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ApiError,
  closeCampaign,
  getBrandCampaigns,
  publishCampaign,
} from '../src/api';
import { authClient } from '../src/authClient';
import { CAMPAIGN_STATUS_LABEL, ROUTE } from '../src/constants';
import { useMe } from '../src/hooks';
import { Action, Notice, Page, SignOutAction, ui } from '../src/ui';
import { colors, fontSize, fontWeight, radii, spacing } from '../src/ui/theme';

export default function BrandCampaigns() {
  const { data: session, isPending } = authClient.useSession();
  const state = useMe(session?.user.id);
  const [campaigns, setCampaigns] = useState<CampaignDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!session?.user.id) return;
      let active = true;
      const controller = new AbortController();
      setLoading(true);
      setError('');
      getBrandCampaigns(controller.signal)
        .then((value) => {
          if (active) setCampaigns(value);
        })
        .catch((cause) => {
          if (active)
            setError(
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
    }, [session?.user.id])
  );

  if (isPending)
    return (
      <Page title="Deine Kampagnen">
        <ActivityIndicator />
      </Page>
    );
  if (!session) return <Redirect href={ROUTE.signIn} />;
  if (state.loading)
    return (
      <Page title="Deine Kampagnen">
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

  async function transition(id: string, action: 'publish' | 'close') {
    setBusyId(id);
    setError('');
    try {
      const updated = await (action === 'publish'
        ? publishCampaign(id)
        : closeCampaign(id));
      setCampaigns((list) =>
        list.map((item) => (item.id === id ? updated : item))
      );
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : MESSAGES.connection);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Page
      title="Deine Kampagnen"
      subtitle="Erstelle Entwürfe, veröffentliche sie für Creator und schließe sie bei Bedarf wieder."
    >
      <Action onPress={() => router.push(ROUTE.campaignForm)}>
        Neue Kampagne
      </Action>
      <Notice message={error} error />
      {loading ? (
        <ActivityIndicator />
      ) : campaigns.length === 0 ? (
        <Notice message="Du hast noch keine Kampagne erstellt." />
      ) : (
        campaigns.map((campaign) => (
          <View key={campaign.id} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.title}>{campaign.title}</Text>
              <Text
                style={[
                  styles.badge,
                  campaign.status === CAMPAIGN_STATUS.published &&
                    styles.badgePublished,
                  campaign.status === CAMPAIGN_STATUS.closed &&
                    styles.badgeClosed,
                ]}
              >
                {CAMPAIGN_STATUS_LABEL[campaign.status]}
              </Text>
            </View>
            <Text style={ui.body}>
              {campaign.productName} ·{' '}
              {campaign.compensation.type === DEAL.barter ? 'Barter' : 'Paid'}
            </Text>
            <View style={ui.row}>
              <Pressable
                disabled={busyId !== null}
                onPress={() =>
                  router.push({
                    pathname: ROUTE.campaignForm,
                    params: { id: campaign.id },
                  })
                }
                style={ui.chip}
              >
                <Text style={ui.label}>
                  {campaign.status === CAMPAIGN_STATUS.closed
                    ? 'Ansehen'
                    : 'Bearbeiten'}
                </Text>
              </Pressable>
              {campaign.status === CAMPAIGN_STATUS.draft && (
                <Pressable
                  disabled={busyId !== null}
                  onPress={() => void transition(campaign.id, 'publish')}
                  style={ui.chip}
                >
                  <Text style={ui.label}>
                    {busyId === campaign.id
                      ? 'Wird veröffentlicht …'
                      : 'Veröffentlichen'}
                  </Text>
                </Pressable>
              )}
              {campaign.status === CAMPAIGN_STATUS.published && (
                <Pressable
                  disabled={busyId !== null}
                  onPress={() => void transition(campaign.id, 'close')}
                  style={ui.chip}
                >
                  <Text style={ui.label}>
                    {busyId === campaign.id
                      ? 'Wird geschlossen …'
                      : 'Schließen'}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        ))
      )}
      <Action secondary onPress={() => router.replace(ROUTE.home)}>
        Zurück
      </Action>
      <SignOutAction />
    </Page>
  );
}
const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.card,
    gap: spacing.row,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.card,
    fontWeight: fontWeight.bold,
    color: colors.text,
    flexShrink: 1,
  },
  badge: {
    fontSize: fontSize.badge,
    fontWeight: fontWeight.bold,
    color: colors.muted,
    backgroundColor: colors.notice,
    paddingHorizontal: spacing.row,
    paddingVertical: spacing.compact,
    borderRadius: radii.small,
  },
  badgePublished: { color: colors.success, backgroundColor: colors.selected },
  badgeClosed: { color: colors.muted, backgroundColor: colors.closed },
});
