import {
  CAMPAIGN_STATUS,
  campaignInputSchema,
  DEAL,
  HTTP,
  IMAGE,
  LIMITS,
  MESSAGES,
  type CampaignDetail,
  type CampaignInput,
} from '@create-for-christ/contracts';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import {
  ApiError,
  createCampaign,
  updateCampaign,
  uploadCampaignImage,
} from '../../api';
import { apiUrl } from '../../authClient';
import { DEAL_LABEL, MONEY, ROUTE } from '../../constants';
import { fieldErrors, splitList } from '../../forms';
import {
  Action,
  Check,
  Choice,
  Field,
  Notice,
  Page,
  SignOutAction,
  ui,
} from '../../ui';
import { layout, radii, spacing } from '../../ui/theme';

export function CampaignForm({ initial }: { initial: CampaignDetail | null }) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [productName, setProductName] = useState(initial?.productName ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [dealType, setDealType] = useState<'barter' | 'paid'>(
    initial?.compensation.type ?? DEAL.barter
  );
  const [productValue, setProductValue] = useState(
    initial?.compensation.type === DEAL.barter
      ? String(initial.compensation.productValueMinor / MONEY.minorPerUnit)
      : ''
  );
  const [amountPerReel, setAmountPerReel] = useState(
    initial?.compensation.type === DEAL.paid
      ? String(initial.compensation.amountPerReelMinor / MONEY.minorPerUnit)
      : ''
  );
  const [currency, setCurrency] = useState(
    initial?.currency ?? MONEY.defaultCurrency
  );
  const [reelCount, setReelCount] = useState(String(initial?.reelCount ?? 1));
  const [reelLengthSeconds, setReelLengthSeconds] = useState(
    initial?.reelLengthSeconds ? String(initial.reelLengthSeconds) : ''
  );
  const [creatorSlots, setCreatorSlots] = useState(
    String(initial?.creatorSlots ?? 1)
  );
  const [contentDeadline, setContentDeadline] = useState(
    initial?.contentDeadline?.slice(0, 10) ?? ''
  );
  const [shippingRequired, setShippingRequired] = useState(
    initial?.shippingRequired ?? false
  );
  const [shippingNotes, setShippingNotes] = useState(
    initial?.shippingNotes ?? ''
  );
  const [requiredMentions, setRequiredMentions] = useState(
    initial?.requiredMentions.join(', ') ?? ''
  );
  const [minPostingDurationDays, setMinPostingDurationDays] = useState(
    initial?.minPostingDurationDays
      ? String(initial.minPostingDurationDays)
      : ''
  );
  const [usageDurationDays, setUsageDurationDays] = useState(
    initial?.usageDurationDays ? String(initial.usageDurationDays) : ''
  );
  const [usageChannels, setUsageChannels] = useState(
    initial?.usageChannels.join(', ') ?? ''
  );
  const [usagePaidAdsAllowed, setUsagePaidAdsAllowed] = useState(
    initial?.usagePaidAdsAllowed ?? false
  );
  const [productImageUrl, setProductImageUrl] = useState(
    initial?.productImageUrl ?? null
  );
  const [campaignId, setCampaignId] = useState(initial?.id ?? null);

  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [fields, setFields] = useState<Record<string, string>>({});
  const [imageBusy, setImageBusy] = useState(false),
    [imageError, setImageError] = useState('');

  function toNumber(value: string): number | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return Number(trimmed);
  }
  function toMinor(value: string): number {
    const normalized = value.trim().replace(',', '.');
    return /^\d+(\.\d{1,2})?$/.test(normalized)
      ? Math.round(Number(normalized) * MONEY.minorPerUnit)
      : NaN;
  }

  async function submit() {
    if (busy || imageBusy || initial?.status === CAMPAIGN_STATUS.closed) return;
    setError('');
    setFields({});
    const input: CampaignInput = {
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
        ? `${contentDeadline.trim()}T00:00:00.000Z`
        : null,
      shippingRequired,
      shippingNotes,
      requiredMentions: splitList(requiredMentions),
      minPostingDurationDays: toNumber(minPostingDurationDays),
      usageDurationDays: toNumber(usageDurationDays),
      usageChannels: splitList(usageChannels),
      usagePaidAdsAllowed,
    };
    const result = campaignInputSchema.safeParse(input);
    if (!result.success) {
      setFields(fieldErrors(result.error.issues));
      setError(MESSAGES.invalidFields);
      return;
    }
    setBusy(true);
    try {
      const saved = campaignId
        ? await updateCampaign(campaignId, result.data)
        : await createCampaign(result.data);
      setCampaignId(saved.id);
      if (!initial)
        router.replace({
          pathname: ROUTE.campaignForm,
          params: { id: saved.id },
        });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : MESSAGES.connection);
    } finally {
      setBusy(false);
    }
  }

  async function pickImage() {
    if (
      !campaignId ||
      busy ||
      imageBusy ||
      initial?.status === CAMPAIGN_STATUS.closed
    )
      return;
    setImageBusy(true);
    setImageError('');
    try {
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: IMAGE.pickerQuality,
        allowsEditing: true,
        base64: true,
      });
      if (picked.canceled || !picked.assets[0]) return;
      const asset = picked.assets[0];
      const mimeType = asset.mimeType ?? 'image/jpeg';
      if (!asset.base64)
        throw new ApiError(
          HTTP.badRequest,
          'Das Bild konnte nicht gelesen werden.'
        );
      if (asset.base64.length > IMAGE.maxBase64Length)
        throw new ApiError(
          HTTP.payloadTooLarge,
          'Das Bild darf höchstens 5 MB groß sein.'
        );
      if (!(IMAGE.mimeTypes as readonly string[]).includes(mimeType))
        throw new ApiError(
          HTTP.badRequest,
          'Bitte ein JPEG-, PNG- oder WebP-Bild auswählen.'
        );
      const updated = await uploadCampaignImage(campaignId, {
        mimeType,
        base64: asset.base64,
      });
      setProductImageUrl(updated.productImageUrl);
    } catch (cause) {
      setImageError(
        cause instanceof ApiError
          ? cause.message
          : 'Das Bild konnte nicht hochgeladen werden.'
      );
    } finally {
      setImageBusy(false);
    }
  }

  return (
    <Page
      title={initial ? 'Kampagne bearbeiten' : 'Neue Kampagne'}
      subtitle="Titel, Produkt, Vergütung, Leistung und Bedingungen für deine Reel-Kooperation."
    >
      <Text style={ui.label}>Kampagne</Text>
      <Field
        label="Titel"
        value={title}
        onChangeText={setTitle}
        maxLength={LIMITS.shortText}
        error={fields.title}
        editable={!busy}
      />
      <Field
        label="Produktname"
        value={productName}
        onChangeText={setProductName}
        maxLength={LIMITS.shortText}
        error={fields.productName}
        editable={!busy}
      />
      <Field
        label="Reel-Briefing"
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={LIMITS.campaignDescription}
        error={fields.description}
        editable={!busy}
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
            disabled={busy}
            checked={dealType === value}
            onPress={() => setDealType(value)}
            label={DEAL_LABEL[value]}
          />
        ))}
      </View>
      {dealType === DEAL.barter ? (
        <Field
          label="Produktwert (in Hauptwährungseinheit)"
          value={productValue}
          onChangeText={setProductValue}
          keyboardType="decimal-pad"
          error={fields.compensation}
          editable={!busy}
        />
      ) : (
        <Field
          label="Honorar pro Reel (in Hauptwährungseinheit)"
          value={amountPerReel}
          onChangeText={setAmountPerReel}
          keyboardType="decimal-pad"
          error={fields.compensation}
          editable={!busy}
        />
      )}
      <Field
        label="Währung (z. B. EUR)"
        value={currency}
        onChangeText={setCurrency}
        autoCapitalize="characters"
        maxLength={3}
        error={fields.currency}
        editable={!busy}
      />

      <Text style={ui.label}>Leistung</Text>
      <Field
        label="Anzahl Reels"
        value={reelCount}
        onChangeText={setReelCount}
        keyboardType="number-pad"
        error={fields.reelCount}
        editable={!busy}
      />
      <Field
        label="Länge pro Reel in Sekunden (optional)"
        value={reelLengthSeconds}
        onChangeText={setReelLengthSeconds}
        keyboardType="number-pad"
        error={fields.reelLengthSeconds}
        editable={!busy}
      />
      <Field
        label="Veröffentlichungstermin (JJJJ-MM-TT, optional)"
        value={contentDeadline}
        onChangeText={setContentDeadline}
        placeholder="2026-10-01"
        error={fields.contentDeadline}
        editable={!busy}
      />
      <Field
        label="Anzahl gesuchter Creator"
        value={creatorSlots}
        onChangeText={setCreatorSlots}
        keyboardType="number-pad"
        error={fields.creatorSlots}
        editable={!busy}
      />

      <Text style={ui.label}>Bedingungen</Text>
      <Check
        disabled={busy}
        checked={shippingRequired}
        onPress={() => setShippingRequired((value) => !value)}
        label="Versand erforderlich"
      />
      <Field
        label="Versandhinweise (optional)"
        value={shippingNotes}
        onChangeText={setShippingNotes}
        multiline
        maxLength={LIMITS.shippingNotes}
        error={fields.shippingNotes}
        editable={!busy}
      />
      <Field
        label="Erforderliche Markierungen (Instagram-Namen, mit Komma trennen)"
        value={requiredMentions}
        onChangeText={setRequiredMentions}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="deinebrand"
        error={fields.requiredMentions}
        editable={!busy}
      />
      <Field
        label="Mindestdauer der Veröffentlichung in Tagen (optional)"
        value={minPostingDurationDays}
        onChangeText={setMinPostingDurationDays}
        keyboardType="number-pad"
        error={fields.minPostingDurationDays}
        editable={!busy}
      />
      <Field
        label="Nutzungsrechte: Dauer in Tagen (optional)"
        value={usageDurationDays}
        onChangeText={setUsageDurationDays}
        keyboardType="number-pad"
        error={fields.usageDurationDays}
        editable={!busy}
      />
      <Field
        label="Nutzungsrechte: Kanäle (mit Komma trennen)"
        value={usageChannels}
        onChangeText={setUsageChannels}
        placeholder="Instagram Feed, Instagram Story"
        error={fields.usageChannels}
        editable={!busy}
      />
      <Check
        disabled={busy}
        checked={usagePaidAdsAllowed}
        onPress={() => setUsagePaidAdsAllowed((value) => !value)}
        label="Verwendung als bezahlte Werbung erlaubt"
      />

      <Notice message={error} error />
      <Action
        busy={busy}
        disabled={imageBusy || initial?.status === CAMPAIGN_STATUS.closed}
        onPress={() => void submit()}
      >
        {campaignId ? 'Änderungen speichern' : 'Als Entwurf speichern'}
      </Action>
      <Action
        secondary
        disabled={busy}
        onPress={() => router.replace(ROUTE.brandCampaigns)}
      >
        Zurück zur Übersicht
      </Action>
      <SignOutAction disabled={busy} />
    </Page>
  );
}
