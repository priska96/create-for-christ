import { API_PATH, AUTH, LIMITS, MESSAGES } from '@create-for-christ/contracts';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { apiUrl, authClient, authError } from '../src/auth-client';
import { ROUTE } from '../src/constants';
import { Action, Field, Notice, Page } from '../src/ui';

export default function SignUp() {
  const { data: session } = authClient.useSession();
  const [name, setName] = useState(''),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [sent, setSent] = useState(false);
  if (session) return <Redirect href={ROUTE.home} />;
  async function submit() {
    setError('');
    if (!name.trim() || !email.trim()) {
      setError('Bitte Name und E-Mail-Adresse ausfüllen.');
      return;
    }
    if (
      password.length < AUTH.minPasswordLength ||
      password.length > AUTH.maxPasswordLength
    ) {
      setError('Wähle ein Passwort mit 10 bis 128 Zeichen.');
      return;
    }
    if (password !== confirm) {
      setError('Die Passwörter stimmen nicht überein.');
      return;
    }
    setBusy(true);
    try {
      const result = await authClient.signUp.email({
        name: name.trim(),
        email: email.trim(),
        password,
        callbackURL: `${apiUrl}${API_PATH.verified}`,
      });
      if (result.error) {
        setError(authError(result.error.code));
        return;
      }
      setPassword('');
      setConfirm('');
      setSent(true);
    } catch {
      setError(MESSAGES.connection);
    } finally {
      setBusy(false);
    }
  }
  if (sent)
    return (
      <Page
        title="Schau in dein Postfach."
        subtitle="Bestätige deine E-Mail-Adresse über den Link. Danach kannst du dich anmelden und dein Creator- oder Brand-Profil anlegen."
      >
        <Notice message="Falls für diese Adresse ein neues Konto angelegt werden konnte, ist die Bestätigungs-E-Mail unterwegs. Prüfe auch deinen Spam-Ordner." />
        <Action onPress={() => router.replace(ROUTE.signIn)}>
          Weiter zur Anmeldung
        </Action>
      </Page>
    );
  return (
    <Page
      title="Deine Geschichte beginnt hier."
      subtitle="Erstelle dein Konto. Dein Creator- oder Brand-Profil richtest du direkt nach der Bestätigung ein."
    >
      <Field
        label="Dein Name"
        value={name}
        onChangeText={setName}
        maxLength={LIMITS.shortText}
        autoComplete="name"
      />
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
        label="Passwort (mindestens 10 Zeichen)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCorrect={false}
        autoCapitalize="none"
        autoComplete="new-password"
        maxLength={AUTH.maxPasswordLength}
      />
      <Field
        label="Passwort wiederholen"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        autoCorrect={false}
        autoCapitalize="none"
        autoComplete="new-password"
        maxLength={AUTH.maxPasswordLength}
      />
      <Notice message={error} error />
      <Action busy={busy} onPress={() => void submit()}>
        Konto erstellen
      </Action>
      <Action
        secondary
        disabled={busy}
        onPress={() => router.replace(ROUTE.signIn)}
      >
        Ich habe schon ein Konto
      </Action>
      <Action
        secondary
        disabled={busy}
        onPress={() => router.replace(ROUTE.home)}
      >
        Zurück zur Übersicht
      </Action>
    </Page>
  );
}
