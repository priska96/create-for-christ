import { usePasswordResetRequest } from '../src/hooks/useAuthMutations';
import { AuthError } from '../src/api/auth';
import { queryError } from '../src/query/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { FORM_OPTIONS, applyAuthErrors } from '../src/forms';
import { emailFormSchema } from '@create-for-christ/contracts';
import { router } from 'expo-router';
import { useState } from 'react';
import { ROUTE } from '../src/constants';
import { Action, FormField, Notice, Page } from '../src/ui';

export default function ForgotPassword() {
  const {
    control,
    setError: setFieldError,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    ...FORM_OPTIONS,
    resolver: zodResolver(emailFormSchema),
    defaultValues: { email: '' },
  });
  const mutation = usePasswordResetRequest();
  const error = queryError(mutation.error);
  const [sent, setSent] = useState(false);
  const busy = isSubmitting || mutation.isPending;
  async function submit({ email }: { email: string }) {
    try {
      await mutation.mutateAsync({ email });
      setSent(true);
    } catch (cause) {
      if (cause instanceof AuthError)
        applyAuthErrors(cause.code, setFieldError, ['email']);
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
          <Notice message={error} error />
          <Action busy={busy} onPress={() => void handleSubmit(submit)()}>
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
