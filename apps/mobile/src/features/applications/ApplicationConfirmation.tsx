import { APPLICATION, type FeedCampaign } from '@create-for-christ/contracts';
import { Modal, Text } from 'react-native';
import { Action, Field, Notice, Page, ui } from '../../ui';
import { CampaignBrief } from './CampaignBrief';
export function ApplicationConfirmation({
  campaign,
  visible,
  pitch,
  busy,
  error,
  onPitchChange,
  onCancel,
  onSubmit,
  onReload,
}: {
  campaign: FeedCampaign;
  visible: boolean;
  pitch: string;
  busy: boolean;
  error: string;
  onPitchChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  onReload: () => void;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={() => {
        if (!busy) onCancel();
      }}
    >
      <Page title="Bewerbung bestätigen">
        <CampaignBrief campaign={campaign} compact showImage={false} />
        <Text style={ui.body}>
          Du bewirbst dich zu den gezeigten Bedingungen. Erst wenn die Brand
          zusagt, entsteht ein Match.
        </Text>
        <Notice error message={error} />
        <Field
          label="Dein Pitch (optional)"
          multiline
          maxLength={APPLICATION.pitchLength}
          value={pitch}
          onChangeText={onPitchChange}
          editable={!busy}
        />
        <Action busy={busy} onPress={onSubmit}>
          Bewerbung senden
        </Action>
        <Action secondary disabled={busy} onPress={onCancel}>
          Abbrechen
        </Action>
        {error && (
          <Action secondary disabled={busy} onPress={onReload}>
            Bedingungen neu laden
          </Action>
        )}
      </Page>
    </Modal>
  );
}
