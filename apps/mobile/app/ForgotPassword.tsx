import { API_PATH, MESSAGES } from '@create-for-christ/contracts';
import { router } from 'expo-router';
import { useState } from 'react';
import { apiUrl, authClient, authError } from '../src/authClient';
import { ROUTE } from '../src/constants';
import { Action, Field, Notice, Page } from '../src/ui';

export default function ForgotPassword() {
  const [email, setEmail] = useState(''),
    [busy, setBusy] = useState(false),
    [sent, setSent] = useState(false),
    [error, setError] = useState('');
  async function submit() {
    if (!email.trim()) {
      setError('Bitte deine E-Mail-Adresse eingeben.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await authClient.requestPasswordReset({
        email: email.trim(),
        redirectTo: `${apiUrl}${API_PATH.resetPassword}`,
      });
      if (result.error) {
        setError(authError(result.error.code));
        return;
      }
      setSent(true);
    } catch {
      setError(MESSAGES.connection);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page
      title="Ein neuer Anfang."
      subtitle="Wir schicken dir einen Link, mit dem du ein neues Passwort festlegen kannst."
    >
      {sent ? (
        <Notice message="Falls ein Konto mit dieser E-Mail-Adresse existiert, erhältst du einen Link. Er ist eine Stunde gültig." />
      ) : (
        <>
          <Field
            label="E-Mail-Adresse"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
          />
          <Notice message={error} error />
          <Action busy={busy} onPress={() => void submit()}>
            Link anfordern
          </Action>
        </>
      )}
      <Action
        secondary
        disabled={busy}
        onPress={() => router.replace(ROUTE.signIn)}
      >
        Zurück zur Anmeldung
      </Action>
    </Page>
  );
}
