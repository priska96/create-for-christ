import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useResetPassword } from './hooks/useResetPassword.js';
import { AUTH, resetPasswordFormSchema } from '@create-for-christ/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useForm } from 'react-hook-form';

// Keep the token in memory and remove it from the address bar before rendering.
const params = new URLSearchParams(window.location.search);
const token = params.get('token');
const invalidLink = !token || params.has('error');
window.history.replaceState(null, '', window.location.pathname);

function ResetPassword() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resetPasswordFormSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: { password: '', confirm: '' },
  });
  const [saved, setSaved] = useState(false);
  const mutation = useResetPassword(token);
  const error = mutation.error
    ? 'Das Passwort konnte nicht geändert werden. Prüfe die Verbindung oder fordere einen neuen Link an.'
    : '';
  async function submit({ password }: { password: string; confirm: string }) {
    try {
      await mutation.mutateAsync(password);
      reset();
      setSaved(true);
    } catch {
      /* The mutation error is shown below the fields. */
    }
  }
  if (invalidLink)
    return (
      <p role="alert">
        Dieser Link ist ungültig oder abgelaufen. Fordere in der App einen neuen
        Link an.
      </p>
    );
  if (saved)
    return (
      <p role="status">
        Passwort gespeichert. Du kannst dich jetzt in der App anmelden.
      </p>
    );
  return (
    <form noValidate onSubmit={(event) => void handleSubmit(submit)(event)}>
      {(
        [
          { name: 'password', label: 'Neues Passwort' },
          { name: 'confirm', label: 'Passwort wiederholen' },
        ] as const
      ).map(({ name, label }) => (
        <div key={name}>
          <label htmlFor={name}>{label}</label>
          <input
            {...register(name, {
              deps: name === 'password' ? ['confirm'] : undefined,
            })}
            id={name}
            type="password"
            autoComplete="new-password"
            maxLength={AUTH.maxPasswordLength}
            disabled={isSubmitting}
            aria-invalid={Boolean(errors[name])}
            aria-describedby={errors[name] ? `${name}-error` : undefined}
          />
          {errors[name] && (
            <p className="field-error" id={`${name}-error`} role="alert">
              {errors[name].message}
            </p>
          )}
        </div>
      ))}
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Wird gespeichert …' : 'Passwort speichern'}
      </button>
    </form>
  );
}
const container = document.getElementById('reset');
if (container)
  createRoot(container).render(
    <QueryClientProvider client={new QueryClient()}>
      <ResetPassword />
    </QueryClientProvider>
  );
