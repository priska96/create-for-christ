import {
  APPLICATION_STATUS,
  type ApplicationRecord,
} from '@create-for-christ/contracts';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Text, View } from 'react-native';
import { decideApplication, getApplications } from '../../api/applications';
import { FILTER_ALL, ROUTE } from '../../constants';
import { useMutation } from '../../hooks/useMutation';
import { usePagedItems } from '../../hooks/usePagedItems';
import { Action, Choice, Notice, Page, ui } from '../../ui';
import { CampaignBrief } from './CampaignBrief';
import {
  DECISION,
  INSTAGRAM_PROFILE_URL,
  STATUS_LABEL,
  type Decision,
} from './constants';
import { styles } from './styles';
export function ApplicationList({ campaignId }: { campaignId?: string }) {
  const [filter, setFilter] = useState<
    ApplicationRecord['status'] | typeof FILTER_ALL
  >(FILTER_ALL);
  const [decision, setDecision] = useState<{
    id: string;
    action: Decision;
  } | null>(null);
  const [notice, setNotice] = useState('');
  const mutation = useMutation();
  const fetchPage = useCallback(
    async (cursor: string | undefined, signal: AbortSignal) => {
      const result = await getApplications(
        { cursor, ...(filter === FILTER_ALL ? {} : { status: filter }) },
        campaignId,
        signal
      );
      return { items: result.applications, nextCursor: result.nextCursor };
    },
    [campaignId, filter]
  );
  const page = usePagedItems(fetchPage);
  function update(application: ApplicationRecord) {
    page.setItems((items) =>
      items
        .map((item) => (item.id === application.id ? application : item))
        .filter((item) => filter === FILTER_ALL || item.status === filter)
    );
    setDecision(null);
    setNotice(
      application.status === APPLICATION_STATUS.accepted
        ? 'Bewerbung angenommen. Euer Match wurde erstellt.'
        : 'Bewerbung abgelehnt.'
    );
  }
  function openLink(url: string) {
    void mutation.run(
      async () => {
        await Linking.openURL(url);
      },
      () => {}
    );
  }
  return (
    <Page
      title={
        campaignId ? 'Bewerbungen für deine Kampagne' : 'Meine Bewerbungen'
      }
      subtitle={
        campaignId
          ? 'Prüfe Creator und ihre Bewerbung. Eine Zusage reserviert einen Kampagnenplatz.'
          : 'Hier siehst du, welche Brands dir bereits zugesagt haben.'
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
              setDecision(null);
            }}
          />
        ))}
      </View>
      <Notice message={notice} />
      <Notice error message={mutation.error || page.error} />
      {page.items.map((application) => (
        <View key={application.id} style={styles.card}>
          <Text style={styles.status}>{STATUS_LABEL[application.status]}</Text>
          {campaignId && (
            <>
              <Text style={styles.title}>
                {application.creator.displayName}
              </Text>
              <Text style={ui.body}>{application.creator.bio}</Text>
              <Text style={ui.body}>
                {[
                  application.creator.location,
                  application.creator.languages.join(', '),
                  application.creator.topics.join(', '),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              <Action
                secondary
                disabled={mutation.busy}
                onPress={() =>
                  openLink(
                    `${INSTAGRAM_PROFILE_URL}${encodeURIComponent(application.creator.instagramHandle)}/`
                  )
                }
              >{`@${application.creator.instagramHandle} auf Instagram`}</Action>
              {application.creator.portfolioUrls.map((url, index) => (
                <Action
                  key={url}
                  secondary
                  disabled={mutation.busy}
                  onPress={() => openLink(url)}
                >{`Portfolio-Reel ${index + 1}`}</Action>
              ))}
            </>
          )}
          <Text style={ui.label}>Bedingungen zum Bewerbungszeitpunkt</Text>
          <CampaignBrief campaign={application.campaign} showImage={false} />
          <Text style={ui.body}>
            Pitch: {application.pitch || 'Kein Pitch angegeben.'}
          </Text>
          {application.collaborationId && (
            <Notice message="Ihr habt ein Match! Die Brand hat diese Bewerbung angenommen." />
          )}
          {campaignId &&
            application.status === APPLICATION_STATUS.pending &&
            (decision?.id === application.id ? (
              <>
                <Notice
                  message={
                    decision.action === DECISION.accept
                      ? 'Diese Bewerbung zu den gespeicherten Bedingungen annehmen und einen Platz reservieren?'
                      : 'Diese Bewerbung endgültig ablehnen?'
                  }
                />
                <Action
                  busy={mutation.busy}
                  onPress={() =>
                    void mutation.run(
                      () => decideApplication(application.id, decision.action),
                      update
                    )
                  }
                >
                  {decision.action === DECISION.accept
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
                  onPress={() =>
                    setDecision({ id: application.id, action: DECISION.accept })
                  }
                >
                  Annehmen
                </Action>
                <Action
                  secondary
                  disabled={mutation.busy}
                  onPress={() =>
                    setDecision({ id: application.id, action: DECISION.reject })
                  }
                >
                  Ablehnen
                </Action>
              </>
            ))}
        </View>
      ))}
      {page.loading && <ActivityIndicator />}
      {!page.loading && !page.items.length && !page.error && (
        <Notice message="Hier gibt es noch keine Bewerbungen." />
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
      <Action
        secondary
        disabled={mutation.busy || page.loading}
        onPress={() => {
          setDecision(null);
          mutation.clearError();
          page.reload();
        }}
      >
        Aktualisieren
      </Action>
      <Action
        secondary
        onPress={() =>
          router.replace(campaignId ? ROUTE.brandCampaigns : ROUTE.home)
        }
      >
        Zurück
      </Action>
    </Page>
  );
}
