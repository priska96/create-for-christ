import { useSaveCampaign } from '../../hooks/useCampaignQueries';
import { useCampaignImage } from '../../hooks/useCampaignImage';
import { queryError } from '../../query/client';
import {
  CAMPAIGN_STATUS,
  campaignInputSchema,
  DEAL,
  LIMITS,
  type CampaignDetail,
  type CampaignInput,
} from '@create-for-christ/contracts';
import { router } from 'expo-router';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Image, Text, View } from 'react-native';
import { apiUrl } from '../../authClient';
import { DEAL_LABEL, MONEY, ROUTE } from '../../constants';
import {
  FORM_OPTIONS,
  formResolver,
  applyApiErrors,
  splitList,
} from '../../forms';
import {
  Action,
  Check,
  Choice,
  FormField,
  Notice,
  Page,
  SignOutAction,
  ui,
} from '../../ui';
import { layout, radii, spacing } from '../../ui/theme';

export function CampaignForm({ initial }: { initial: CampaignDetail | null }) {
  const defaultValues = {
    title: initial?.title ?? '',
    productName: initial?.productName ?? '',
    description: initial?.description ?? '',
    dealType: (initial?.compensation.type ?? DEAL.barter) as 'barter' | 'paid',
    productValue:
      initial?.compensation.type === DEAL.barter
        ? String(initial.compensation.productValueMinor / MONEY.minorPerUnit)
        : '',
    amountPerReel:
      initial?.compensation.type === DEAL.paid
        ? String(initial.compensation.amountPerReelMinor / MONEY.minorPerUnit)
        : '',
    currency: initial?.currency ?? MONEY.defaultCurrency,
    reelCount: String(initial?.reelCount ?? 1),
    reelLengthSeconds: initial?.reelLengthSeconds
      ? String(initial.reelLengthSeconds)
      : '',
    creatorSlots: String(initial?.creatorSlots ?? 1),
    contentDeadline: initial?.contentDeadline?.slice(0, 10) ?? '',
    shippingRequired: initial?.shippingRequired ?? false,
    shippingNotes: initial?.shippingNotes ?? '',
    requiredMentions: initial?.requiredMentions.join(', ') ?? '',
    minPostingDurationDays: initial?.minPostingDurationDays
      ? String(initial.minPostingDurationDays)
      : '',
    usageDurationDays: initial?.usageDurationDays
      ? String(initial.usageDurationDays)
      : '',
    usageChannels: initial?.usageChannels.join(', ') ?? '',
    usagePaidAdsAllowed: initial?.usagePaidAdsAllowed ?? false,
  };
  type FormValues = typeof defaultValues;
  function toInput({
    title,
    productName,
    description,
    dealType,
    productValue,
    amountPerReel,
    currency,
    reelCount,
    reelLengthSeconds,
    creatorSlots,
    contentDeadline,
    shippingRequired,
    shippingNotes,
    requiredMentions,
    minPostingDurationDays,
    usageDurationDays,
    usageChannels,
    usagePaidAdsAllowed,
  }: FormValues): CampaignInput {
    return {
      title,
      productName,
      description,
      compensation:
        dealType === DEAL.barter
          ? { type: DEAL.barter, productValueMinor: toMinor(productValue) }
          : { type: DEAL.paid, amountPerReelMinor: toMinor(amountPerReel) },
      currency,
      reelCount: toNumber(reelCount) ?? 0,
      reelLengthSeconds: toNumber(reelLengthSeconds),
      creatorSlots: toNumber(creatorSlots) ?? 0,
      contentDeadline: contentDeadline.trim()
        ? contentDeadline.trim() === initial?.contentDeadline?.slice(0, 10)
          ? initial.contentDeadline
          : `${contentDeadline.trim()}T00:00:00.000Z`
        : null,
      shippingRequired,
      shippingNotes,
      requiredMentions: splitList(requiredMentions),
      minPostingDurationDays: toNumber(minPostingDurationDays),
      usageDurationDays: toNumber(usageDurationDays),
      usageChannels: splitList(usageChannels),
      usagePaidAdsAllowed,
    };
  }
  const fieldName = (path: string, values: FormValues) =>
    path === 'compensation'
      ? values.dealType === DEAL.barter
        ? 'productValue'
        : 'amountPerReel'
      : path;
  const {
    control,
    handleSubmit,
    setValue,
    clearErrors,
    setError: setFieldError,
    formState: { isSubmitting },
  } = useForm({
    defaultValues,
    ...FORM_OPTIONS,
    resolver: formResolver<FormValues>(
      (values) => campaignInputSchema.safeParse(toInput(values)),
      fieldName
    ),
  });
  const dealType = useWatch({ control, name: 'dealType' });
  const shippingRequired = useWatch({ control, name: 'shippingRequired' });
  const usagePaidAdsAllowed = useWatch({
    control,
    name: 'usagePaidAdsAllowed',
  });
  const [productImageUrl, setProductImageUrl] = useState(
    initial?.productImageUrl ?? null
  );
  const [campaignId, setCampaignId] = useState(initial?.id ?? null);

  const mutation = useSaveCampaign();
  const imageMutation = useCampaignImage();
  const error = queryError(mutation.error);
  const imageError = queryError(imageMutation.error);
  const imageBusy = imageMutation.isPending;

  function toNumber(value: string): number | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return /^\d+$/.test(trimmed) ? Number(trimmed) : NaN;
  }
  function toMinor(value: string): number {
    const normalized = value.trim().replace(',', '.');
    return /^\d+(\.\d{1,2})?$/.test(normalized)
      ? Math.round(Number(normalized) * MONEY.minorPerUnit)
      : NaN;
  }

  const busy = isSubmitting || mutation.isPending;
  const disabled =
    busy || imageBusy || initial?.status === CAMPAIGN_STATUS.closed;

  async function submit(values: FormValues) {
    if (imageBusy || initial?.status === CAMPAIGN_STATUS.closed) return;
    try {
      const saved = await mutation.mutateAsync({
        id: campaignId,
        input: campaignInputSchema.parse(toInput(values)),
      });
      setCampaignId(saved.id);
      if (!initial)
        router.replace({
          pathname: ROUTE.campaignForm,
          params: { id: saved.id },
        });
    } catch (cause) {
      applyApiErrors(cause, setFieldError, values, (path) =>
        fieldName(path, values)
      );
    }
  }
  function pickImage() {
    if (!campaignId || disabled) return;
    imageMutation.mutate(campaignId, {
      onSuccess: (updated) => {
        if (updated) setProductImageUrl(updated.productImageUrl);
      },
    });
  }

  return (
    <Page
      title={initial ? 'Kampagne bearbeiten' : 'Neue Kampagne'}
      subtitle="Titel, Produkt, Vergütung, Leistung und Bedingungen für deine Reel-Kooperation."
    >
      <Text style={ui.label}>Kampagne</Text>
      <FormField
        label="Titel"
        control={control}
        name="title"
        maxLength={LIMITS.shortText}
        editable={!disabled}
      />
      <FormField
        label="Produktname"
        control={control}
        name="productName"
        maxLength={LIMITS.shortText}
        editable={!disabled}
      />
      <FormField
        label="Reel-Briefing"
        control={control}
        name="description"
        multiline
        maxLength={LIMITS.campaignDescription}
        editable={!disabled}
      />
      {campaignId ? (
        <View style={{ gap: spacing.sm }}>
          {productImageUrl && (
            <Image
              accessibilityIgnoresInvertColors
              source={{ uri: `${apiUrl}${productImageUrl}` }}
              style={{
                width: '100%',
                height: layout.previewHeight,
                borderRadius: radii.image,
              }}
              resizeMode="cover"
            />
          )}
          <Action
            secondary
            disabled={busy || initial?.status === CAMPAIGN_STATUS.closed}
            busy={imageBusy}
            onPress={() => void pickImage()}
          >
            {productImageUrl ? 'Produktbild ändern' : 'Produktbild hochladen'}
          </Action>
          <Notice message={imageError} error />
        </View>
      ) : (
        <Text style={ui.body}>
          Speichere die Kampagne zuerst, um ein Produktbild hochzuladen.
        </Text>
      )}

      <Text style={ui.label}>Vergütung</Text>
      <View style={ui.row}>
        {Object.values(DEAL).map((value) => (
          <Choice
            key={value}
            disabled={disabled}
            checked={dealType === value}
            onPress={() => {
              clearErrors(['productValue', 'amountPerReel']);
              setValue('dealType', value, { shouldDirty: true });
            }}
            label={DEAL_LABEL[value]}
          />
        ))}
      </View>
      {dealType === DEAL.barter ? (
        <FormField
          label="Produktwert (in Hauptwährungseinheit)"
          control={control}
          name="productValue"
          keyboardType="decimal-pad"
          editable={!disabled}
        />
      ) : (
        <FormField
          label="Honorar pro Reel (in Hauptwährungseinheit)"
          control={control}
          name="amountPerReel"
          keyboardType="decimal-pad"
          editable={!disabled}
        />
      )}
      <FormField
        label="Währung (z. B. EUR)"
        control={control}
        name="currency"
        autoCapitalize="characters"
        maxLength={3}
        editable={!disabled}
      />

      <Text style={ui.label}>Leistung</Text>
      <FormField
        label="Anzahl Reels"
        control={control}
        name="reelCount"
        keyboardType="number-pad"
        editable={!disabled}
      />
      <FormField
        label="Länge pro Reel in Sekunden (optional)"
        control={control}
        name="reelLengthSeconds"
        keyboardType="number-pad"
        editable={!disabled}
      />
      <FormField
        label="Veröffentlichungstermin (JJJJ-MM-TT, optional)"
        control={control}
        name="contentDeadline"
        placeholder="2026-10-01"
        editable={!disabled}
      />
      <FormField
        label="Anzahl gesuchter Creator"
        control={control}
        name="creatorSlots"
        keyboardType="number-pad"
        editable={!disabled}
      />

      <Text style={ui.label}>Bedingungen</Text>
      <Check
        disabled={disabled}
        checked={shippingRequired}
        onPress={() =>
          setValue('shippingRequired', !shippingRequired, { shouldDirty: true })
        }
        label="Versand erforderlich"
      />
      <FormField
        label="Versandhinweise (optional)"
        control={control}
        name="shippingNotes"
        multiline
        maxLength={LIMITS.shippingNotes}
        editable={!disabled}
      />
      <FormField
        label="Erforderliche Markierungen (Instagram-Namen, mit Komma trennen)"
        control={control}
        name="requiredMentions"
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="deinebrand"
        editable={!disabled}
      />
      <FormField
        label="Mindestdauer der Veröffentlichung in Tagen (optional)"
        control={control}
        name="minPostingDurationDays"
        keyboardType="number-pad"
        editable={!disabled}
      />
      <FormField
        label="Nutzungsrechte: Dauer in Tagen (optional)"
        control={control}
        name="usageDurationDays"
        keyboardType="number-pad"
        editable={!disabled}
      />
      <FormField
        label="Nutzungsrechte: Kanäle (mit Komma trennen)"
        control={control}
        name="usageChannels"
        placeholder="Instagram Feed, Instagram Story"
        editable={!disabled}
      />
      <Check
        disabled={disabled}
        checked={usagePaidAdsAllowed}
        onPress={() =>
          setValue('usagePaidAdsAllowed', !usagePaidAdsAllowed, {
            shouldDirty: true,
          })
        }
        label="Verwendung als bezahlte Werbung erlaubt"
      />

      <Notice message={error} error />
      <Action
        busy={busy}
        disabled={imageBusy || initial?.status === CAMPAIGN_STATUS.closed}
        onPress={() => void handleSubmit(submit)()}
      >
        {campaignId ? 'Änderungen speichern' : 'Als Entwurf speichern'}
      </Action>
      <Action
        secondary
        disabled={disabled}
        onPress={() => router.replace(ROUTE.brandCampaigns)}
      >
        Zurück zur Übersicht
      </Action>
      <SignOutAction disabled={disabled} />
    </Page>
  );
}
