import { useCallback, useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import {
  Redirect,
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  campaignInputSchema,
  type CampaignDetail,
  type CampaignInput,
} from "@create-for-christ/contracts";
import { authClient } from "../src/auth-client";
import { apiUrl } from "../src/auth-client";
import { useMe } from "../src/use-me";
import {
  ApiError,
  createCampaign,
  getBrandCampaigns,
  updateCampaign,
  uploadCampaignImage,
} from "../src/api";
import { Action, Field, Notice, Page, SignOutAction, ui } from "../src/ui";

export default function BrandCampaignForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data: session, isPending } = authClient.useSession();
  const state = useMe(session?.user.id);
  const [existing, setExisting] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [loadError, setLoadError] = useState("");

  useFocusEffect(
    useCallback(() => {
      if (!id || !session) {
        setLoading(false);
        return;
      }
      let active = true;
      const controller = new AbortController();
      setLoading(true);
      setLoadError("");
      getBrandCampaigns(controller.signal)
        .then((list) => {
          if (!active) return;
          const found = list.find((item) => item.id === id);
          if (!found) {
            setLoadError("Kampagne nicht gefunden.");
            return;
          }
          setExisting(found);
        })
        .catch((cause) => {
          if (active)
            setLoadError(
              cause instanceof ApiError
                ? cause.message
                : "Keine Verbindung. Bitte versuche es erneut.",
            );
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
        controller.abort();
      };
    }, [id, session]),
  );

  if (isPending)
    return (
      <Page title="Kampagne">
        <ActivityIndicator />
      </Page>
    );
  if (!session) return <Redirect href="/sign-in" />;
  if (state.loading || loading)
    return (
      <Page title="Kampagne">
        <ActivityIndicator />
      </Page>
    );
  if (!state.me?.profile) return <Redirect href="/profile" />;
  if (state.me.profile.details.role !== "brand") return <Redirect href="/" />;
  if (loadError)
    return (
      <Page title="Kampagne">
        <Notice message={loadError} error />
        <Action onPress={() => router.replace("/brand-campaigns")}>
          Zurück zur Übersicht
        </Action>
      </Page>
    );

  return <CampaignForm key={id ?? "new"} initial={existing} />;
}

function CampaignForm({ initial }: { initial: CampaignDetail | null }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [productName, setProductName] = useState(initial?.productName ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [dealType, setDealType] = useState<"barter" | "paid">(
    initial?.compensation.type ?? "barter",
  );
  const [productValue, setProductValue] = useState(
    initial?.compensation.type === "barter"
      ? String(initial.compensation.productValueMinor / 100)
      : "",
  );
  const [amountPerReel, setAmountPerReel] = useState(
    initial?.compensation.type === "paid"
      ? String(initial.compensation.amountPerReelMinor / 100)
      : "",
  );
  const [currency, setCurrency] = useState(initial?.currency ?? "EUR");
  const [reelCount, setReelCount] = useState(String(initial?.reelCount ?? 1));
  const [reelLengthSeconds, setReelLengthSeconds] = useState(
    initial?.reelLengthSeconds ? String(initial.reelLengthSeconds) : "",
  );
  const [creatorSlots, setCreatorSlots] = useState(
    String(initial?.creatorSlots ?? 1),
  );
  const [contentDeadline, setContentDeadline] = useState(
    initial?.contentDeadline?.slice(0, 10) ?? "",
  );
  const [shippingRequired, setShippingRequired] = useState(
    initial?.shippingRequired ?? false,
  );
  const [shippingNotes, setShippingNotes] = useState(
    initial?.shippingNotes ?? "",
  );
  const [requiredMentions, setRequiredMentions] = useState(
    initial?.requiredMentions.join(", ") ?? "",
  );
  const [minPostingDurationDays, setMinPostingDurationDays] = useState(
    initial?.minPostingDurationDays
      ? String(initial.minPostingDurationDays)
      : "",
  );
  const [usageDurationDays, setUsageDurationDays] = useState(
    initial?.usageDurationDays ? String(initial.usageDurationDays) : "",
  );
  const [usageChannels, setUsageChannels] = useState(
    initial?.usageChannels.join(", ") ?? "",
  );
  const [usagePaidAdsAllowed, setUsagePaidAdsAllowed] = useState(
    initial?.usagePaidAdsAllowed ?? false,
  );
  const [productImageUrl, setProductImageUrl] = useState(
    initial?.productImageUrl ?? null,
  );
  const [campaignId, setCampaignId] = useState(initial?.id ?? null);

  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [fields, setFields] = useState<Record<string, string>>({});
  const [imageBusy, setImageBusy] = useState(false),
    [imageError, setImageError] = useState("");

  function toNumber(value: string): number | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return parsed;
  }
  function toMinor(value: string): number {
    const normalized = value.trim().replace(",", ".");
    return /^\d+(\.\d{1,2})?$/.test(normalized) ? Math.round(Number(normalized) * 100) : NaN;
  }
  function list(value: string) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  async function submit() {
    if (busy || imageBusy || initial?.status === "closed") return;
    setError("");
    setFields({});
    const input: CampaignInput = {
      title,
      productName,
      description,
      compensation:
        dealType === "barter"
          ? { type: "barter", productValueMinor: toMinor(productValue) }
          : { type: "paid", amountPerReelMinor: toMinor(amountPerReel) },
      currency,
      reelCount: toNumber(reelCount) ?? 0,
      reelLengthSeconds: toNumber(reelLengthSeconds),
      creatorSlots: toNumber(creatorSlots) ?? 0,
      contentDeadline: contentDeadline.trim()
        ? `${contentDeadline.trim()}T00:00:00.000Z`
        : null,
      shippingRequired,
      shippingNotes,
      requiredMentions: list(requiredMentions),
      minPostingDurationDays: toNumber(minPostingDurationDays),
      usageDurationDays: toNumber(usageDurationDays),
      usageChannels: list(usageChannels),
      usagePaidAdsAllowed,
    };
    const result = campaignInputSchema.safeParse(input);
    if (!result.success) {
      setFields(
        Object.fromEntries(
          result.error.issues.map((issue) => [
            String(issue.path[0]),
            issue.message,
          ]),
        ),
      );
      setError("Bitte prüfe die markierten Angaben.");
      return;
    }
    setBusy(true);
    try {
      const saved = campaignId
        ? await updateCampaign(campaignId, result.data)
        : await createCampaign(result.data);
      setCampaignId(saved.id);
      if (!initial) router.replace(`/brand-campaign-form?id=${saved.id}`);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Keine Verbindung. Bitte versuche es erneut.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function pickImage() {
    if (!campaignId || busy || imageBusy || initial?.status === "closed") return;
    setImageBusy(true);
    setImageError("");
    try {
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"], quality: 0.8, allowsEditing: true, base64: true,
      });
      if (picked.canceled || !picked.assets[0]) return;
      const asset = picked.assets[0];
      const mimeType = asset.mimeType ?? "image/jpeg";
      if (!asset.base64) throw new ApiError(400, "Das Bild konnte nicht gelesen werden.");
      if (asset.base64.length > 6_990_508) throw new ApiError(413, "Das Bild darf höchstens 5 MB groß sein.");
      if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) throw new ApiError(400, "Bitte ein JPEG-, PNG- oder WebP-Bild auswählen.");
      const updated = await uploadCampaignImage(campaignId, {
        mimeType,
        base64: asset.base64,
      });
      setProductImageUrl(updated.productImageUrl);
    } catch (cause) {
      setImageError(
        cause instanceof ApiError
          ? cause.message
          : "Das Bild konnte nicht hochgeladen werden.",
      );
    } finally {
      setImageBusy(false);
    }
  }

  return (
    <Page
      title={initial ? "Kampagne bearbeiten" : "Neue Kampagne"}
      subtitle="Titel, Produkt, Vergütung, Leistung und Bedingungen für deine Reel-Kooperation."
    >
      <Text style={ui.label}>Kampagne</Text>
      <Field
        label="Titel"
        value={title}
        onChangeText={setTitle}
        maxLength={100}
        error={fields.title}
        editable={!busy}
      />
      <Field
        label="Produktname"
        value={productName}
        onChangeText={setProductName}
        maxLength={100}
        error={fields.productName}
        editable={!busy}
      />
      <Field
        label="Reel-Briefing"
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={2000}
        error={fields.description}
        editable={!busy}
      />
      {campaignId ? (
        <View style={{ gap: 8 }}>
          {productImageUrl && (
            <Image
              accessibilityIgnoresInvertColors
              source={{ uri: `${apiUrl}${productImageUrl}` }}
              style={{ width: "100%", height: 180, borderRadius: 16 }}
              resizeMode="cover"
            />
          )}
          <Action secondary disabled={busy || initial?.status === "closed"} busy={imageBusy} onPress={() => void pickImage()}>
            {productImageUrl ? "Produktbild ändern" : "Produktbild hochladen"}
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
        {(["barter", "paid"] as const).map((value) => (
          <Pressable
            key={value}
            disabled={busy}
            accessibilityRole="radio"
            accessibilityState={{ checked: dealType === value }}
            onPress={() => setDealType(value)}
            style={[ui.chip, dealType === value && ui.selected]}
          >
            <Text style={ui.label}>
              {value === "barter" ? "Barter · Produkt" : "Paid · Honorar"}
            </Text>
          </Pressable>
        ))}
      </View>
      {dealType === "barter" ? (
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
      <Pressable
        disabled={busy}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: shippingRequired }}
        onPress={() => setShippingRequired((value) => !value)}
        style={[
          ui.chip,
          shippingRequired && ui.selected,
          { alignSelf: "flex-start" },
        ]}
      >
        <Text style={ui.label}>Versand erforderlich</Text>
      </Pressable>
      <Field
        label="Versandhinweise (optional)"
        value={shippingNotes}
        onChangeText={setShippingNotes}
        multiline
        maxLength={500}
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
      <Pressable
        disabled={busy}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: usagePaidAdsAllowed }}
        onPress={() => setUsagePaidAdsAllowed((value) => !value)}
        style={[
          ui.chip,
          usagePaidAdsAllowed && ui.selected,
          { alignSelf: "flex-start" },
        ]}
      >
        <Text style={ui.label}>Verwendung als bezahlte Werbung erlaubt</Text>
      </Pressable>

      <Notice message={error} error />
      <Action busy={busy} disabled={imageBusy || initial?.status === "closed"} onPress={() => void submit()}>
        {campaignId ? "Änderungen speichern" : "Als Entwurf speichern"}
      </Action>
      <Action
        secondary
        disabled={busy}
        onPress={() => router.replace("/brand-campaigns")}
      >
        Zurück zur Übersicht
      </Action>
      <SignOutAction disabled={busy} />
    </Page>
  );
}
