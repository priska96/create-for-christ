import {
  APPLICATION_STATUS,
  ROLE,
  type ApplicationRecord,
} from '@create-for-christ/contracts';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Text, View } from 'react-native';
import {
  decideApplication,
  getApplications,
  getBrandInbox,
} from '../../api/applications';
import { FILTER_ALL } from '../../constants';
import { useMutation } from '../../hooks/useMutation';
import { usePagedItems } from '../../hooks/usePagedItems';
import {
  Action,
  Avatar,
  Choice,
  DetailSheet,
  EmptyState,
  IconButton,
  Notice,
  Page,
  ui,
} from '../../ui';
import { CampaignBrief } from './CampaignBrief';
import { ApplicationRow } from './ApplicationRow';
import { MatchPanel } from './MatchPanel';
import {
  DECISION,
  INSTAGRAM_PROFILE_URL,
  STATUS_LABEL,
  type Decision,
} from './constants';
import { styles } from './styles';
export function ApplicationList({
  campaignId,
  brandInbox = false,
}: {
  campaignId?: string;
  brandInbox?: boolean;
}) {
  const brandView = brandInbox || Boolean(campaignId);
  const [filter, setFilter] = useState<
    ApplicationRecord['status'] | typeof FILTER_ALL
  >(FILTER_ALL);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [match, setMatch] = useState<ApplicationRecord | null>(null);
  const [notice, setNotice] = useState('');
  const mutation = useMutation();
  const fetchPage = useCallback(
    async (cursor: string | undefined, signal: AbortSignal) => {
      const query = {
        cursor,
        ...(filter === FILTER_ALL ? {} : { status: filter }),
      };
      const result = await (brandInbox
        ? getBrandInbox(query, signal)
        : getApplications(query, campaignId, signal));
      return { items: result.applications, nextCursor: result.nextCursor };
    },
    [campaignId, brandInbox, filter]
  );
  const page = usePagedItems(fetchPage);
  const selected = page.items.find((item) => item.id === selectedId);
  function update(application: ApplicationRecord) {
    page.setItems((items) =>
      items
        .map((item) => (item.id === application.id ? application : item))
        .filter((item) => filter === FILTER_ALL || item.status === filter)
    );
    setDecision(null);
    setSelectedId(null);
    setNotice(
      application.status === APPLICATION_STATUS.accepted
        ? 'Bewerbung angenommen. Euer Match wurde erstellt.'
        : 'Bewerbung abgelehnt.'
    );
  }
  function open(
    application: ApplicationRecord,
    action: Decision | null = null
  ) {
    mutation.clearError();
    setSelectedId(application.id);
    setDecision(action);
  }
  function openLink(url: string) {
    void mutation.run(
      async () => {
        await Linking.openURL(url);
      },
      () => {}
    );
  }
  function reload() {
    setSelectedId(null);
    setDecision(null);
    mutation.clearError();
    page.reload();
  }
  return (
    <Page
      title="Bewerbungen"
      navigationRole={brandView ? ROLE.brand : ROLE.creator}
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
        {[
          FILTER_ALL,
          APPLICATION_STATUS.pending,
          APPLICATION_STATUS.accepted,
          APPLICATION_STATUS.rejected,
        ].map((value) => (
          <Choice
            key={value}
            label={
              value === FILTER_ALL
                ? 'Alle'
                : STATUS_LABEL[value as ApplicationRecord['status']]
            }
            checked={filter === value}
            disabled={mutation.busy}
            onPress={() => {
              setFilter(value as typeof filter);
              setSelectedId(null);
              setDecision(null);
            }}
          />
        ))}
      </View>
      <Notice message={notice} />
      <Notice
        error
        message={selected ? page.error : mutation.error || page.error}
      />
      <View>
        {page.items.map((application) => (
          <ApplicationRow
            key={application.id}
            application={application}
            brandView={brandView}
            busy={mutation.busy}
            onOpen={() => open(application)}
            onAccept={() => open(application, DECISION.accept)}
            onReject={() => open(application, DECISION.reject)}
          />
        ))}
      </View>
      {page.loading && <ActivityIndicator />}
      {!page.loading && !page.items.length && !page.error && (
        <EmptyState
          icon="file-tray-outline"
          title="Hier beginnt Verbindung."
          description="Hier gibt es noch keine Bewerbungen. Neue Anfragen und Zusagen erscheinen in dieser Übersicht."
        />
      )}
      {page.nextCursor && (
        <Action
          busy={page.loading}
          disabled={mutation.busy}
          onPress={page.more}
        >
          Weitere Bewerbungen laden
        </Action>
      )}
      {selected && (
        <DetailSheet
          title={brandView ? 'Creator-Profil' : 'Deine Bewerbung'}
          fullScreenContent={
            match ? (
              <MatchPanel application={match} onClose={() => setMatch(null)} />
            ) : undefined
          }
          busy={mutation.busy}
          onClose={() => {
            setSelectedId(null);
            setDecision(null);
            setMatch(null);
          }}
        >
          <View style={{ alignItems: 'center' }}>
            <Avatar
              large
              name={
                brandView
                  ? selected.creator.displayName
                  : selected.campaign.brandName
              }
            />
          </View>
          <Text style={ui.title}>
            {brandView
              ? selected.creator.displayName
              : selected.campaign.brandName}
          </Text>
          <Text style={styles.status}>{STATUS_LABEL[selected.status]}</Text>
          {brandView && (
            <>
              <Text style={ui.body}>
                {selected.creator.location} ·{' '}
                {selected.creator.languages.join(', ')}
              </Text>
              <Text style={ui.label}>Über mich</Text>
              <Text style={ui.body}>
                {selected.creator.bio || 'Noch keine Beschreibung.'}
              </Text>
              <Text style={ui.body}>{selected.creator.topics.join(' · ')}</Text>
              <Action
                secondary
                disabled={mutation.busy}
                onPress={() =>
                  openLink(
                    `${INSTAGRAM_PROFILE_URL}${encodeURIComponent(selected.creator.instagramHandle)}/`
                  )
                }
              >{`@${selected.creator.instagramHandle} auf Instagram`}</Action>
              <Text style={ui.label}>Beispiel-Content</Text>
              {selected.creator.portfolioUrls.map((url, index) => (
                <Action
                  key={url}
                  secondary
                  disabled={mutation.busy}
                  onPress={() => openLink(url)}
                >{`Portfolio-Reel ${index + 1}`}</Action>
              ))}
              {!selected.creator.portfolioUrls.length && (
                <Text style={ui.body}>Noch keine Reel-Links angegeben.</Text>
              )}
            </>
          )}
          <Text style={ui.label}>Bedingungen zum Bewerbungszeitpunkt</Text>
          <CampaignBrief campaign={selected.campaign} showImage={false} />
          <Text style={ui.body}>
            Pitch: {selected.pitch || 'Kein Pitch angegeben.'}
          </Text>
          <Notice error message={mutation.error} />
          {selected.collaborationId && (
            <>
              <Notice message="Ihr habt ein Match! Die Brand hat diese Bewerbung angenommen." />
              <Action onPress={() => setMatch(selected)}>Match ansehen</Action>
            </>
          )}
          {brandView &&
            selected.status === APPLICATION_STATUS.pending &&
            (decision ? (
              <>
                <Notice
                  message={
                    decision === DECISION.accept
                      ? 'Diese Bewerbung zu den gespeicherten Bedingungen annehmen und einen Platz reservieren?'
                      : 'Diese Bewerbung endgültig ablehnen?'
                  }
                />
                <Action
                  busy={mutation.busy}
                  onPress={() =>
                    void mutation.run(
                      () => decideApplication(selected.id, decision),
                      update
                    )
                  }
                >
                  {decision === DECISION.accept
                    ? 'Zusage bestätigen'
                    : 'Absage bestätigen'}
                </Action>
                <Action
                  secondary
                  disabled={mutation.busy}
                  onPress={() => setDecision(null)}
                >
                  Abbrechen
                </Action>
              </>
            ) : (
              <>
                <Action
                  disabled={mutation.busy}
                  onPress={() => setDecision(DECISION.accept)}
                >
                  Annehmen
                </Action>
                <Action
                  secondary
                  disabled={mutation.busy}
                  onPress={() => setDecision(DECISION.reject)}
                >
                  Ablehnen
                </Action>
              </>
            ))}
        </DetailSheet>
      )}
    </Page>
  );
}
