import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Redirect, router, useFocusEffect } from "expo-router";
import type { CampaignDetail } from "@create-for-christ/contracts";
import { authClient } from "../src/auth-client";
import { useMe } from "../src/use-me";
import {
  ApiError,
  closeCampaign,
  getBrandCampaigns,
  publishCampaign,
} from "../src/api";
import { Action, Notice, Page, SignOutAction, ui } from "../src/ui";

const statusLabels: Record<CampaignDetail["status"], string> = {
  draft: "Entwurf",
  published: "Veröffentlicht",
  closed: "Geschlossen",
};

export default function BrandCampaigns() {
  const { data: session, isPending } = authClient.useSession();
  const state = useMe(session?.user.id);
  const [campaigns, setCampaigns] = useState<CampaignDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      let active = true;
      const controller = new AbortController();
      setLoading(true);
      setError("");
      getBrandCampaigns(controller.signal)
        .then((value) => {
          if (active) setCampaigns(value);
        })
        .catch((cause) => {
          if (active)
            setError(
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
    }, [session, version]),
  );

  if (isPending)
    return (
      <Page title="Deine Kampagnen">
        <ActivityIndicator />
      </Page>
    );
  if (!session) return <Redirect href="/sign-in" />;
  if (state.loading)
    return (
      <Page title="Deine Kampagnen">
        <ActivityIndicator />
      </Page>
    );
  if (!state.me?.profile) return <Redirect href="/profile" />;
  if (state.me.profile.details.role !== "brand") return <Redirect href="/" />;

  async function transition(id: string, action: "publish" | "close") {
    setBusyId(id);
    setError("");
    try {
      const updated = await (action === "publish"
        ? publishCampaign(id)
        : closeCampaign(id));
      setCampaigns((list) =>
        list.map((item) => (item.id === id ? updated : item)),
      );
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Keine Verbindung. Bitte versuche es erneut.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Page
      title="Deine Kampagnen"
      subtitle="Erstelle Entwürfe, veröffentliche sie für Creator und schließe sie bei Bedarf wieder."
    >
      <Action onPress={() => router.push("/brand-campaign-form")}>
        Neue Kampagne
      </Action>
      <Notice message={error} error />
      {loading ? (
        <ActivityIndicator />
      ) : campaigns.length === 0 ? (
        <Notice message="Du hast noch keine Kampagne erstellt." />
      ) : (
        campaigns.map((campaign) => (
          <View key={campaign.id} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.title}>{campaign.title}</Text>
              <Text
                style={[
                  styles.badge,
                  campaign.status === "published" && styles.badgePublished,
                  campaign.status === "closed" && styles.badgeClosed,
                ]}
              >
                {statusLabels[campaign.status]}
              </Text>
            </View>
            <Text style={ui.body}>
              {campaign.productName} ·{" "}
              {campaign.compensation.type === "barter" ? "Barter" : "Paid"}
            </Text>
            <View style={ui.row}>
              <Pressable
                disabled={busyId !== null}
                onPress={() =>
                  router.push(`/brand-campaign-form?id=${campaign.id}`)
                }
                style={[ui.chip]}
              >
                <Text style={ui.label}>{campaign.status === "closed" ? "Ansehen" : "Bearbeiten"}</Text>
              </Pressable>
              {campaign.status === "draft" && (
                <Pressable
                  disabled={busyId !== null}
                  onPress={() => void transition(campaign.id, "publish")}
                  style={[ui.chip]}
                >
                  <Text style={ui.label}>
                    {busyId === campaign.id
                      ? "Wird veröffentlicht …"
                      : "Veröffentlichen"}
                  </Text>
                </Pressable>
              )}
              {campaign.status === "published" && (
                <Pressable
                  disabled={busyId !== null}
                  onPress={() => void transition(campaign.id, "close")}
                  style={[ui.chip]}
                >
                  <Text style={ui.label}>
                    {busyId === campaign.id
                      ? "Wird geschlossen …"
                      : "Schließen"}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        ))
      )}
      <Action secondary onPress={() => router.replace("/")}>
        Zurück
      </Action>
      <SignOutAction />
    </Page>
  );
}
const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFDF8",
    borderRadius: 20,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: "#E8E7DE",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  title: { fontSize: 17, fontWeight: "700", color: "#203B30", flexShrink: 1 },
  badge: {
    fontSize: 11,
    fontWeight: "700",
    color: "#71766A",
    backgroundColor: "#EAEDE5",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgePublished: { color: "#1F5C3D", backgroundColor: "#DDE8D5" },
  badgeClosed: { color: "#5A5A5A", backgroundColor: "#E4E2DA" },
});
