import { useSignUp } from '../src/hooks/useAuthMutations';
import { AuthError } from '../src/api/auth';
import { queryError } from '../src/query/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { FORM_OPTIONS, applyAuthErrors } from '../src/forms';
import { signUpFormSchema, AUTH, LIMITS } from '@create-for-christ/contracts';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { authClient } from '../src/authClient';
import { ROUTE } from '../src/constants';
import { Action, FormField, Notice, Page } from '../src/ui';

export default function SignUp() {
  const { data: session } = authClient.useSession();
  const {
    control,
    setError: setFieldError,
    handleSubmit,
    resetField,
    formState: { isSubmitting },
  } = useForm({
    ...FORM_OPTIONS,
    resolver: zodResolver(signUpFormSchema),
    defaultValues: { name: '', email: '', password: '', confirm: '' },
  });
  const mutation = useSignUp();
  const error = queryError(mutation.error);
  const [sent, setSent] = useState(false);
  const busy = isSubmitting || mutation.isPending;
  if (session) return <Redirect href={ROUTE.home} />;
  async function submit({
    name,
    email,
    password,
  }: {
    name: string;
    email: string;
    password: string;
    confirm: string;
  }) {
    try {
      await mutation.mutateAsync({ name, email, password });
      resetField('password');
      resetField('confirm');
      setSent(true);
    } catch (cause) {
      if (cause instanceof AuthError)
        applyAuthErrors(cause.code, setFieldError, ['email', 'password']);
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
      <FormField
        label="Dein Name"
        control={control}
        name="name"
        editable={!busy}
        maxLength={LIMITS.shortText}
        autoComplete="name"
      />
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
        label="Passwort (mindestens 10 Zeichen)"
        control={control}
        name="password"
        deps={['confirm']}
        editable={!busy}
        secureTextEntry
        autoCorrect={false}
        autoCapitalize="none"
        autoComplete="new-password"
        maxLength={AUTH.maxPasswordLength}
      />
      <FormField
        label="Passwort wiederholen"
        control={control}
        name="confirm"
        editable={!busy}
        secureTextEntry
        autoCorrect={false}
        autoCapitalize="none"
        autoComplete="new-password"
        maxLength={AUTH.maxPasswordLength}
      />
      <Notice message={error} error />
      <Action busy={busy} onPress={() => void handleSubmit(submit)()}>
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
