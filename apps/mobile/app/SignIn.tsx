import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { FORM_OPTIONS, applyAuthErrors } from '../src/forms';
import {
  signInFormSchema,
  API_PATH,
  MESSAGES,
} from '@create-for-christ/contracts';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { apiUrl, authClient, authError } from '../src/authClient';
import { ROUTE } from '../src/constants';
import { Action, FormField, Notice, Page, ui } from '../src/ui';

export default function SignIn() {
  const { data: session, isPending } = authClient.useSession();
  const {
    control,
    setError: setFieldError,
    handleSubmit,
    resetField,
    trigger,
    getValues,
    formState: { isSubmitting },
  } = useForm({
    ...FORM_OPTIONS,
    resolver: zodResolver(signInFormSchema),
    defaultValues: { email: '', password: '' },
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [resending, setResending] = useState(false);
  const busy = isSubmitting || resending;
  if (session) return <Redirect href={ROUTE.home} />;
  async function login({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) {
    setError('');
    setMessage('');
    try {
      const result = await authClient.signIn.email({
        email: email.trim(),
        password,
      });
      if (result.error) {
        applyAuthErrors(result.error.code, setFieldError, [
          'email',
          'password',
        ]);
        setError(authError(result.error.code));
        return;
      }
      resetField('password');
      router.replace(ROUTE.home);
    } catch {
      setError(MESSAGES.connection);
    }
  }
  async function resend() {
    if (busy || !(await trigger('email'))) return;
    const email = getValues('email');
    setResending(true);
    setError('');
    setMessage('');
    try {
      const result = await authClient.sendVerificationEmail({
        email: email.trim(),
        callbackURL: `${apiUrl}${API_PATH.verified}`,
      });
      if (result.error) {
        applyAuthErrors(result.error.code, setFieldError, ['email']);
        setError(authError(result.error.code));
        return;
      }
      setMessage(
        'Falls eine Bestätigung erforderlich ist, erhältst du einen neuen Link per E-Mail.'
      );
    } catch {
      setError(MESSAGES.connection);
    } finally {
      setResending(false);
    }
  }
  return (
    <Page
      title="Willkommen zurück."
      subtitle="Melde dich an und finde deine nächste Verbindung."
    >
      <FormField
        label="E-Mail-Adresse"
        control={control}
        name="email"
        editable={!busy}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
      />
      <FormField
        label="Passwort"
        control={control}
        name="password"
        editable={!busy}
        secureTextEntry
        autoCorrect={false}
        autoCapitalize="none"
        autoComplete="current-password"
        onSubmitEditing={() => {
          if (!busy) void handleSubmit(login)();
        }}
      />
      <Notice message={error} error />
      <Notice message={message} />
      <Action
        busy={busy}
        disabled={isPending}
        onPress={() => void handleSubmit(login)()}
      >
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
