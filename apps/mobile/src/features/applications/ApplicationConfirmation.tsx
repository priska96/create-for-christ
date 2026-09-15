import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FORM_OPTIONS } from '../../forms';
import {
  APPLICATION,
  applicationInputSchema,
  type FeedCampaign,
} from '@create-for-christ/contracts';
import { Text } from 'react-native';
import { AppModal } from '../../ui/AppModal';
import { Action, FormField, Notice, Page, ui } from '../../ui';
import { CampaignBrief } from './CampaignBrief';
export function ApplicationConfirmation({
  campaign,
  visible,
  busy,
  error,
  onCancel,
  onSubmit,
  onReload,
}: {
  campaign: FeedCampaign;
  visible: boolean;
  busy: boolean;
  error: string;
  onCancel: () => void;
  onSubmit: (pitch: string) => Promise<void>;
  onReload: () => void;
}) {
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    ...FORM_OPTIONS,
    resolver: zodResolver(applicationInputSchema),
    defaultValues: { pitch: '', campaignVersion: campaign.version },
  });
  const submitting = busy || isSubmitting;
  return (
    <AppModal
      visible={visible}
      animationType="slide"
      onRequestClose={() => {
        if (!submitting) onCancel();
      }}
    >
      <Page title="Bewerbung bestätigen">
        <CampaignBrief campaign={campaign} showImage={false} />
        <Text style={ui.body}>
          Du bewirbst dich zu den gezeigten Bedingungen. Erst wenn die Brand
          zusagt, entsteht ein Match.
        </Text>
        <Notice error message={error} />
        <FormField
          label="Dein Pitch (optional)"
          multiline
          maxLength={APPLICATION.pitchLength}
          control={control}
          name="pitch"
          editable={!submitting}
        />
        <Action
          busy={submitting}
          onPress={() => void handleSubmit(({ pitch }) => onSubmit(pitch))()}
        >
          Bewerbung senden
        </Action>
        <Action secondary disabled={submitting} onPress={onCancel}>
          Abbrechen
        </Action>
        {error && (
          <Action secondary disabled={submitting} onPress={onReload}>
            Bedingungen neu laden
          </Action>
        )}
      </Page>
    </AppModal>
  );
}
