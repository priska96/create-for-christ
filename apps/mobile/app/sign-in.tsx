import { API_PATH, MESSAGES } from "@create-for-christ/contracts";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";
import { apiUrl, authClient, authError } from "../src/auth-client";
import { ROUTE } from "../src/constants";
import { Action, Field, Notice, Page, ui } from "../src/ui";
export default function SignIn() {
  const { data: session, isPending } = authClient.useSession();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  if (session) return <Redirect href={ROUTE.home} />;
  async function login() {
    if (!email.trim() || !password) {
      setError("Bitte E-Mail und Passwort ausfüllen.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await authClient.signIn.email({
        email: email.trim(),
        password,
      });
      if (result.error) {
        setError(authError(result.error.code));
        return;
      }
      setPassword("");
      router.replace(ROUTE.home);
    } catch {
      setError(MESSAGES.connection);
    } finally {
      setBusy(false);
    }
  }
  async function resend() {
    if (!email.trim()) {
      setError("Gib zuerst deine E-Mail-Adresse ein.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await authClient.sendVerificationEmail({
        email: email.trim(),
        callbackURL: `${apiUrl}${API_PATH.verified}`,
      });
      if (result.error) {
        setError(authError(result.error.code));
        return;
      }
      setMessage(
        "Falls eine Bestätigung erforderlich ist, erhältst du einen neuen Link per E-Mail.",
      );
    } catch {
      setError(MESSAGES.connection);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page
      title="Willkommen zurück."
      subtitle="Melde dich an und finde deine nächste Verbindung."
    >
      <Field
        label="E-Mail-Adresse"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
      />
      <Field
        label="Passwort"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCorrect={false}
        autoCapitalize="none"
        autoComplete="current-password"
        onSubmitEditing={() => {
          if (!busy) void login();
        }}
      />
      <Notice message={error} error />
      <Notice message={message} />
      <Action busy={busy} disabled={isPending} onPress={() => void login()}>
        Anmelden
      </Action>
      <Action
        secondary
        disabled={busy}
        onPress={() => router.push(ROUTE.forgotPassword)}
      >
        Passwort vergessen?
      </Action>
      <Action secondary disabled={busy} onPress={() => void resend()}>
        Bestätigungs-E-Mail erneut senden
      </Action>
      <Text style={ui.body}>Noch kein Konto?</Text>
      <Action secondary onPress={() => router.replace(ROUTE.signUp)}>
        Konto erstellen
      </Action>
      <Action secondary onPress={() => router.replace(ROUTE.home)}>
        Zurück zur Übersicht
      </Action>
    </Page>
  );
}
