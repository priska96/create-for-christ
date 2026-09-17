import {
  DEAL,
  ROLE,
  type FeedCampaign,
  type DealType,
} from '@create-for-christ/contracts';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import {
  useCreatorFeed,
  useApplyToCampaign,
  useDismissCampaign,
} from '../../hooks/useApplicationQueries';
import { queryError } from '../../query/client';
import { DEAL_LABEL, FILTER_ALL } from '../../constants';
import {
  Action,
  Choice,
  DetailSheet,
  IconButton,
  Notice,
  Page,
  ui,
} from '../../ui';
import { CampaignBrief } from './CampaignBrief';
import { ApplicationConfirmation } from './ApplicationConfirmation';
import { CampaignSwipeCard } from './CampaignSwipeCard';
import { SwipeCard } from './SwipeCard';
import { useDetailSwipes } from '../../hooks/useDetailSwipes';
import { styles } from './styles';

export function CreatorFeed() {
  const [filter, setFilter] = useState<DealType | typeof FILTER_ALL>(
    FILTER_ALL
  );
  const [confirming, setConfirming] = useState<FeedCampaign | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [notice, setNotice] = useState('');
  const apply = useApplyToCampaign();
  const dismissMutation = useDismissCampaign();
  const busy = apply.isPending || dismissMutation.isPending;
  const error = queryError(apply.error || dismissMutation.error);
  function clearError() {
    apply.reset();
    dismissMutation.reset();
  }
  const page = useCreatorFeed(filter);
  const campaign = page.items[0];
  function complete(message: string) {
    setConfirming(null);
    setNotice(message);
  }
  function interested() {
    setConfirming(campaign ?? null);
    setNotice('');
    clearError();
  }
  function dismiss() {
    if (campaign)
      dismissMutation.mutate(campaign.id, {
        onSuccess: () => complete('Kampagne übersprungen.'),
      });
  }

  const detailSwipes = useDetailSwipes({
    disabled: busy || Boolean(confirming),
    onInterested: () => {
      setShowDetails(false);
      interested();
    },
    onDismiss: () => {
      setShowDetails(false);
      dismiss();
    },
    onClose: () => setShowDetails(false),
  });
  function reload() {
    setConfirming(null);
    setNotice('');
    clearError();
    page.reload();
  }
  return (
    <Page
      title="Entdecke Brands"
      navigationRole={ROLE.creator}
      headerAction={
        <IconButton
          small
          icon="refresh-outline"
          label="Aktualisieren"
          disabled={busy || page.loading}
          onPress={reload}
        />
      }
    >
      <View style={styles.filters}>
        {[FILTER_ALL, ...Object.values(DEAL)].map((value) => (
          <Choice
            key={value}
            label={
              value === FILTER_ALL
                ? 'Alle Deals'
                : DEAL_LABEL[value as DealType]
            }
            checked={filter === value}
            disabled={busy || Boolean(confirming)}
            onPress={() => {
              setFilter(value as typeof filter);
              setNotice('');
              clearError();
            }}
          />
        ))}
      </View>

      <Notice message={notice} />
      <Notice error message={confirming ? '' : error || page.error} />
      {page.loading && <ActivityIndicator />}
      {campaign && !page.loading && (
        <>
          <SwipeCard
            key={campaign.id}
            underlay={
              page.items[1] ? (
                <CampaignSwipeCard campaign={page.items[1]} />
              ) : undefined
            }
            disabled={busy || Boolean(confirming)}
            onInterested={interested}
            onDismiss={dismiss}
            onDetails={() => setShowDetails(true)}
          >
            <CampaignSwipeCard campaign={campaign} />
          </SwipeCard>
          <View style={{ ...ui.row, justifyContent: 'center' }}>
            <IconButton
              icon="close"
              label="Nicht interessiert"
              tone="negative"
              busy={busy}
              disabled={Boolean(confirming)}
              onPress={dismiss}
            />
            <IconButton
              icon="information"
              label="Kampagnendetails"
              disabled={busy}
              onPress={() => setShowDetails(true)}
            />
            <IconButton
              icon="heart"
              label="Bewerben"
              tone="positive"
              disabled={busy || Boolean(confirming)}
              onPress={interested}
            />
          </View>
          <Text style={[ui.body, { textAlign: 'center' }]}>
            {campaign.remainingSlots} freie Plätze · Swipe. Match. Create.
          </Text>
          {showDetails && (
            <DetailSheet
              title="Deine Kooperation"
              transparent
              busy={busy}
              {...detailSwipes}
              onClose={() => setShowDetails(false)}
            >
              <Text style={ui.body}>
                ← Nicht interessiert · Bewerben → · ↓ Zurück (am Seitenanfang)
              </Text>
              <CampaignBrief campaign={campaign} />
              <Action
                onPress={() => {
                  setShowDetails(false);
                  interested();
                }}
              >
                Bewerben
              </Action>
            </DetailSheet>
          )}
        </>
      )}
      {confirming && (
        <ApplicationConfirmation
          campaign={confirming}
          visible={Boolean(confirming)}
          busy={busy}
          error={error}
          onCancel={() => {
            setConfirming(null);
            clearError();
          }}
          onSubmit={async (pitch) => {
            try {
              await apply.mutateAsync({
                id: confirming.id,
                input: { pitch, campaignVersion: confirming.version },
              });
              complete('Bewerbung gesendet. Die Brand kann dir jetzt zusagen.');
            } catch {
              /* The mutation error is displayed in the confirmation. */
            }
          }}
          onReload={reload}
        />
      )}
      {!campaign && !page.loading && !page.error && (
        <Notice
          message={
            page.nextCursor
              ? 'Diese Kampagnen hast du angesehen. Weitere warten auf dich.'
              : 'Aktuell gibt es keine weiteren passenden Kampagnen. Schau später wieder vorbei oder passe deine Deal-Präferenzen an.'
          }
        />
      )}
      {page.nextCursor && !campaign && (
        <Action busy={page.loading} onPress={page.more}>
          Weitere Kampagnen laden
        </Action>
      )}
    </Page>
  );
}
