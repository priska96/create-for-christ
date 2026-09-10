import {
  DEAL,
  LIMITS,
  MESSAGES,
  profileInputSchema,
  ROLE,
  type OwnProfile,
  type ProfileInput,
} from "@create-for-christ/contracts";
import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { saveProfile } from "../../api";
import { DEAL_LABEL, ROUTE } from "../../constants";
import { fieldErrors, splitList } from "../../forms";
import {
  Action,
  Check,
  Choice,
  Field,
  Notice,
  Page,
  SignOutAction,
  ui,
} from "../../ui";
export function ProfileForm({
  initial,
  name,
}: {
  initial: OwnProfile | null;
  name: string;
}) {
  const details = initial?.details;
  const [role, setRole] = useState<"creator" | "brand">(
    details?.role ?? ROLE.creator,
  );
  const [displayName, setDisplayName] = useState(details?.displayName ?? name);
  const [location, setLocation] = useState(details?.location ?? "");
  const [bio, setBio] = useState(
    details?.role === ROLE.creator ? details.bio : "",
  );
  const [instagram, setInstagram] = useState(
    details?.role === ROLE.creator ? details.instagramHandle : "",
  );
  const [languages, setLanguages] = useState(
    details?.role === ROLE.creator ? details.languages.join(", ") : "Deutsch",
  );
  const [topics, setTopics] = useState(
    details?.role === ROLE.creator ? details.topics.join(", ") : "",
  );
  const [portfolio, setPortfolio] = useState(
    details?.role === ROLE.creator ? details.portfolioUrls.join("\n") : "",
  );
  const [deals, setDeals] = useState<Array<"barter" | "paid">>(
    details?.role === ROLE.creator
      ? details.dealPreferences
      : ["barter", "paid"],
  );
  const [brandName, setBrandName] = useState(
    details?.role === ROLE.brand ? details.brandName : "",
  );
  const [description, setDescription] = useState(
    details?.role === ROLE.brand ? details.description : "",
  );
  const [website, setWebsite] = useState(
    details?.role === ROLE.brand ? details.website : "",
  );
  const [industry, setIndustry] = useState(
    details?.role === ROLE.brand ? details.industry : "",
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [fields, setFields] = useState<Record<string, string>>({});
  function toggleDeal(deal: "barter" | "paid") {
    setDeals((values) =>
      values.includes(deal)
        ? values.filter((value) => value !== deal)
        : [...values, deal],
    );
  }
  async function submit() {
    setError("");
    setFields({});

    const input: ProfileInput =
      role === ROLE.creator
        ? {
            role,
            displayName,
            bio,
            instagramHandle: instagram.replace(/^@/, ""),
            location,
            languages: splitList(languages),
            topics: splitList(topics),
            dealPreferences: deals,
            portfolioUrls: splitList(portfolio, "\n"),
          }
        : {
            role,
            displayName,
            brandName,
            description,
            website,
            industry,
            location,
          };
    const result = profileInputSchema.safeParse(input);
    if (!result.success) {
      setFields(fieldErrors(result.error.issues));
      setError(MESSAGES.invalidFields);
      return;
    }
    setBusy(true);
    try {
      await saveProfile(result.data);
      router.replace(ROUTE.home);
    } catch (cause) {
      setError(
        cause instanceof Error && cause.name !== "AbortError"
          ? cause.message
          : MESSAGES.connection,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page
      title={initial ? "Dein Profil." : "Was möchtest du bewegen?"}
      subtitle={
        initial
          ? "Halte deine Angaben aktuell."
          : "Wähle deine Rolle und richte dein Profil ein. Die Rolle bleibt danach fest mit deinem Konto verbunden."
      }
    >
      {!initial ? (
        <View style={ui.row}>
          {Object.values(ROLE).map((value) => (
            <Choice
              key={value}
              disabled={busy}
              checked={role === value}
              onPress={() => setRole(value)}
              label={
                value === ROLE.creator
                  ? "Ich bin Creator"
                  : "Ich bin eine Brand"
              }
            />
          ))}
        </View>
      ) : (
        <Text style={ui.label}>
          {role === ROLE.creator ? "Creator-Profil" : "Brand-Profil"}
        </Text>
      )}
      <Field
        label={
          role === ROLE.brand ? "Dein Name / Ansprechpartner" : "Dein Name"
        }
        value={displayName}
        onChangeText={setDisplayName}
        maxLength={LIMITS.shortText}
        error={fields.displayName}
        editable={!busy}
      />
      {role === ROLE.creator ? (
        <>
          <Field
            label="Instagram-Nutzername"
            value={instagram}
            onChangeText={setInstagram}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="dein.name"
            error={fields.instagramHandle}
            editable={!busy}
          />
          <Text style={ui.body}>
            Dein Instagram-Kanal muss öffentlich sein. Hier veröffentlichst du
            deine Reels.
          </Text>
          <Field
            label="Über dich"
            value={bio}
            onChangeText={setBio}
            multiline
            maxLength={LIMITS.creatorBio}
            error={fields.bio}
            editable={!busy}
          />
          <Field
            label="Sprachen (mit Komma trennen)"
            value={languages}
            onChangeText={setLanguages}
            placeholder="Deutsch, Englisch"
            error={fields.languages}
            editable={!busy}
          />
          <Field
            label="Themen (mit Komma trennen)"
            value={topics}
            onChangeText={setTopics}
            placeholder="Beauty, Food, Fitness"
            error={fields.topics}
            editable={!busy}
          />
          <Text style={ui.label}>Welche Deals interessieren dich?</Text>
          <View style={ui.field}>
            {Object.values(DEAL).map((deal) => (
              <Check
                key={deal}
                disabled={busy}
                checked={deals.includes(deal)}
                onPress={() => toggleDeal(deal)}
                label={DEAL_LABEL[deal]}
              />
            ))}
          </View>
          {fields.dealPreferences && (
            <Text style={ui.error}>{fields.dealPreferences}</Text>
          )}
          <Field
            label="Reel-Portfolio (optional, ein Link pro Zeile)"
            value={portfolio}
            onChangeText={setPortfolio}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="https://www.instagram.com/reel/…/"
            error={fields.portfolioUrls}
            editable={!busy}
          />
        </>
      ) : (
        <>
          <Field
            label="Name deiner Brand"
            value={brandName}
            onChangeText={setBrandName}
            maxLength={LIMITS.shortText}
            error={fields.brandName}
            editable={!busy}
          />
          <Field
            label="Über deine Brand"
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={LIMITS.brandDescription}
            error={fields.description}
            editable={!busy}
          />
          <Field
            label="Branche"
            value={industry}
            onChangeText={setIndustry}
            maxLength={LIMITS.shortText}
            placeholder="z. B. Kosmetik"
            error={fields.industry}
            editable={!busy}
          />
          <Field
            label="Website (optional)"
            value={website}
            onChangeText={setWebsite}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="https://deine-brand.de"
            error={fields.website}
            editable={!busy}
          />
        </>
      )}
      <Field
        label="Standort (optional)"
        value={location}
        onChangeText={setLocation}
        maxLength={LIMITS.optionalText}
        error={fields.location}
        editable={!busy}
      />
      <Notice message={error} error />
      <Action busy={busy} onPress={() => void submit()}>
        {initial ? "Änderungen speichern" : "Profil erstellen"}
      </Action>
      {initial && (
        <Action
          secondary
          disabled={busy}
          onPress={() => router.replace(ROUTE.home)}
        >
          Abbrechen
        </Action>
      )}
      <SignOutAction disabled={busy} />
    </Page>
  );
}
