import {
  useSignIn,
  useResendVerification,
} from '../src/hooks/useAuthMutations';
import { AuthError } from '../src/api/auth';
import { queryError } from '../src/query/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { FORM_OPTIONS, applyAuthErrors } from '../src/forms';
import { signInFormSchema } from '@create-for-christ/contracts';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { authClient } from '../src/authClient';
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
  const mutation = useSignIn();
  const resendMutation = useResendVerification();
  const error = queryError(mutation.error || resendMutation.error);
  const [message, setMessage] = useState('');
  const busy = isSubmitting || mutation.isPending || resendMutation.isPending;
  if (session) return <Redirect href={ROUTE.home} />;
  async function login({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) {
    resendMutation.reset();
    setMessage('');
    try {
      await mutation.mutateAsync({ email, password });
      resetField('password');
      router.replace(ROUTE.home);
    } catch (cause) {
      if (cause instanceof AuthError)
        applyAuthErrors(cause.code, setFieldError, ['email', 'password']);
    }
  }
  async function resend() {
    if (busy || !(await trigger('email'))) return;
    mutation.reset();
    setMessage('');
    try {
      await resendMutation.mutateAsync(getValues('email'));
      setMessage(
        'Falls eine Bestätigung erforderlich ist, erhältst du einen neuen Link per E-Mail.'
      );
    } catch (cause) {
      if (cause instanceof AuthError)
        applyAuthErrors(cause.code, setFieldError, ['email']);
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
