import { DEAL, ROLE, type DealType } from '@create-for-christ/contracts';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import {
  applyToCampaign,
  dismissCampaign,
  getCreatorFeed,
} from '../../api/applications';
import { DEAL_LABEL, FILTER_ALL } from '../../constants';
import { useMutation } from '../../hooks/useMutation';
import { usePagedItems } from '../../hooks/usePagedItems';
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
import { styles } from './styles';

export function CreatorFeed() {
  const [filter, setFilter] = useState<DealType | typeof FILTER_ALL>(
    FILTER_ALL
  );
  const [confirming, setConfirming] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [notice, setNotice] = useState('');
  const mutation = useMutation();
  const fetchPage = useCallback(
    async (cursor: string | undefined, signal: AbortSignal) => {
      const page = await getCreatorFeed(
        { cursor, ...(filter === FILTER_ALL ? {} : { dealType: filter }) },
        signal
      );
      return { items: page.campaigns, nextCursor: page.nextCursor };
    },
    [filter]
  );
  const page = usePagedItems(fetchPage);
  const campaign = page.items[0];
  function complete(message: string) {
    page.setItems((items) => items.filter((item) => item.id !== campaign?.id));
    setConfirming(false);
    setNotice(message);
  }
  function interested() {
    setConfirming(true);
    setNotice('');
    mutation.clearError();
  }
  function dismiss() {
    if (campaign)
      void mutation.run(
        () => dismissCampaign(campaign.id),
        () => complete('Kampagne übersprungen.')
      );
  }
  function reload() {
    setConfirming(false);
    setNotice('');
    mutation.clearError();
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
          disabled={mutation.busy || page.loading}
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
            disabled={mutation.busy || confirming}
            onPress={() => {
              setFilter(value as typeof filter);
              setNotice('');
              mutation.clearError();
            }}
          />
        ))}
      </View>

      <Notice message={notice} />
      <Notice error message={confirming ? '' : mutation.error || page.error} />
      {page.loading && <ActivityIndicator />}
      {campaign && !page.loading && (
        <>
          <SwipeCard
            key={campaign.id}
            disabled={mutation.busy || confirming}
            onInterested={interested}
            onDismiss={dismiss}
          >
            <CampaignSwipeCard campaign={campaign} />
          </SwipeCard>
          <View style={{ ...ui.row, justifyContent: 'center' }}>
            <IconButton
              icon="close"
              label="Nicht interessiert"
              tone="negative"
              busy={mutation.busy}
              disabled={confirming}
              onPress={dismiss}
            />
            <IconButton
              icon="information"
              label="Kampagnendetails"
              disabled={mutation.busy}
              onPress={() => setShowDetails(true)}
            />
            <IconButton
              icon="heart"
              label="Bewerben"
              tone="positive"
              disabled={mutation.busy || confirming}
              onPress={interested}
            />
          </View>
          <Text style={[ui.body, { textAlign: 'center' }]}>
            {campaign.remainingSlots} freie Plätze · Swipe. Match. Create.
          </Text>
          {showDetails && (
            <DetailSheet
              title="Deine Kooperation"
              onClose={() => setShowDetails(false)}
            >
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
          {confirming && (
            <ApplicationConfirmation
              campaign={campaign}
              visible={confirming}
              busy={mutation.busy}
              error={mutation.error}
              onCancel={() => {
                setConfirming(false);
                mutation.clearError();
              }}
              onSubmit={(pitch) =>
                mutation.run(
                  () =>
                    applyToCampaign(campaign.id, {
                      pitch,
                      campaignVersion: campaign.version,
                    }),
                  () =>
                    complete(
                      'Bewerbung gesendet. Die Brand kann dir jetzt zusagen.'
                    )
                )
              }
              onReload={reload}
            />
          )}
        </>
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
